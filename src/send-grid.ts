import sgMail, { MailDataRequired } from "@sendgrid/mail";
import SendGridClient from "@sendgrid/client";
import { Request, Response } from "express";
import ResponseHelper from "./helpers/response.helper";
import { RedisClientType } from "redis";

type TemplateType = "welcome" | "social" | "verifyEmail" | "contactUs";

export enum EmailSeverity {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

type TemplateConfig = {
  welcome: {
    isMultiple: boolean;
    test: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
  };
  social: {
    isMultiple: boolean;
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
  };
  verifyEmail: {
    confirm_link: string;
  };
  contactUs: {
    isMultiple: boolean;
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
  };
};

type DynamicDataArgs<T extends TemplateType> = TemplateConfig[T];

class SendGridController {
  private static redisClient?: RedisClientType | null = null;
  private static fromEmail: string;
  private static emailLists: Record<string, string[]> = {};
  private static serverName: string | null = null;

  public static addEmailList({
    name,
    emails,
  }: {
    name: string;
    emails: string[];
  }) {
    this.emailLists[name] = emails;
  }

  public static getEmailList(name: string) {
    return this.emailLists[name];
  }

  public static addEmailToList({
    name,
    email,
  }: {
    name: string;
    email: string;
  }) {
    if (!this.emailLists[name]) {
      this.emailLists[name] = [];
    }
    this.emailLists[name].push(email);
  }

  public static removeEmailFromList({
    name,
    email,
  }: {
    name: string;
    email: string;
  }) {
    if (this.emailLists[name]) {
      this.emailLists[name] = this.emailLists[name].filter((e) => e !== email);
    }
  }

  public static init({
    SEND_GRID_API_KEY,
    SEND_GRID_FULL_ACCESS_API_KEY,
    fromEmail,
    redisClient,
    emailLists = {},
    serverName,
  }: {
    SEND_GRID_FULL_ACCESS_API_KEY: string;
    SEND_GRID_API_KEY: string;
    fromEmail: string;
    redisClient?: RedisClientType;
    emailLists?: Record<string, string[]>;
    serverName?: string;
  }) {
    sgMail.setApiKey(SEND_GRID_API_KEY);
    SendGridClient.setApiKey(SEND_GRID_FULL_ACCESS_API_KEY);
    this.fromEmail = fromEmail;
    this.redisClient = redisClient;
    this.emailLists = emailLists;
    this.serverName = serverName;
  }

  private static getTemplateId(templateType: TemplateType) {
    switch (templateType) {
      case "verifyEmail":
        return "d-b55ac18a5e694cab8bdda5b253b04432";
      default:
        return "d-93f7a608a568480c826236a2896d47fa";
    }
  }

  public static async getAvailableTemplates(req: Request, res: Response) {
    try {
      let lastSaved: string | null;
      let lastSavedAt: string | null;
      if (this.redisClient) {
        lastSaved = await this.redisClient.get("latest-templates");
        lastSavedAt = await this.redisClient.get("latest-templates-at");
      } else {
        lastSaved = null;
        lastSavedAt = null;
      }

      // cache for 5 minutes
      if (
        lastSavedAt &&
        lastSaved &&
        Date.now() - parseInt(lastSavedAt) < 5 * 60 * 1000
      ) {
        return ResponseHelper.success(res, {
          message: "Templates fetched successfully",
          data: {
            templates: JSON.parse(lastSaved),
          },
        });
      }

      const [response, body] = await SendGridClient.request({
        method: "GET",
        url: "/v3/templates?generations=dynamic&page_size=200",
      });

      if (response?.statusCode !== 200) {
        return ResponseHelper.serverError(res, "Internal server error.");
      }

      const templates = body?.result;

      if (!templates) {
        return ResponseHelper.serverError(res, "Internal server error.");
      }

      if (templates && this.redisClient) {
        this.redisClient.set("latest-templates", JSON.stringify(templates));
        this.redisClient.set("latest-templates-at", Date.now().toString());
      }

      return ResponseHelper.success(res, {
        message: "Templates fetched successfully",
        data: {
          templates,
        },
      });
    } catch (error: any) {
      return ResponseHelper.serverError(res, "Internal server error.");
    }
  }

  public static async sendDynamicTemplate<T extends TemplateType>({
    dynamicDataType,
    dynamicData,
    to,
    subject,
  }: {
    dynamicDataType: T;
    dynamicData: DynamicDataArgs<T>;
    to: string | string[];
    subject?: string;
  }) {
    const msg: MailDataRequired = {
      to: to,
      from: this.fromEmail,
      subject: subject,
      templateId: this.getTemplateId(dynamicDataType),
      dynamicTemplateData: dynamicData,
    };

    try {
      const emailSent = await sgMail.send(msg);
      return emailSent;
    } catch (error: any) {
      if (error.response) {
        console.error(error.response.body);
      }
      return null;
    }
  }

  public static async sendAnyTemplate({
    to,
    subject,
    dynamicData,
    templateId,
    html,
    inCludeNameInSubject = false,
  }: {
    to: string | string[];
    subject?: string;
    templateId?: string;
    dynamicData?: Record<string, any>;
    html?: string;
    inCludeNameInSubject?: boolean;
  }) {
    const toEmails = [];

    if (typeof to === "string") {
      toEmails.push(this.emailLists[to] ?? to);
    }

    if (Array.isArray(to)) {
      to.forEach((t) => {
        toEmails.push(this.emailLists[t] ?? t);
      });
    }

    const msg: MailDataRequired = {
      to: toEmails,
      from: this.fromEmail,
      subject: `${
        inCludeNameInSubject && this.serverName ? `${this.serverName}: ` : ""
      }${subject}`,
      templateId: templateId,
      dynamicTemplateData: dynamicData,
      html: html,
    };

    try {
      const emailSent = await sgMail.send(msg);
      return emailSent;
    } catch (error: any) {
      if (error.response) {
        console.error(error.response.body);
      }
      return null;
    }
  }
}

export default SendGridController;
