import sgMail, { MailDataRequired } from "@sendgrid/mail";
import SendGridClient from "@sendgrid/client";
import { Request, Response } from "express";
import ResponseHelper from "./helpers/response.helper";
import { RedisClientType } from "redis";

type TemplateType = "welcome" | "social" | "verifyEmail" | "contactUs";

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

  public static init({
    SEND_GRID_API_KEY,
    SEND_GRID_FULL_ACCESS_API_KEY,
    redisClient,
  }: {
    SEND_GRID_FULL_ACCESS_API_KEY: string;
    SEND_GRID_API_KEY: string;
    redisClient?: RedisClientType;
  }) {
    sgMail.setApiKey(SEND_GRID_API_KEY);
    SendGridClient.setApiKey(SEND_GRID_FULL_ACCESS_API_KEY);
    this.redisClient = redisClient;
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
      from: "team@noya.ai",
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
  }: {
    to: string | string[];
    subject?: string;
    templateId: string;
    dynamicData: Record<string, any>;
  }) {
    const msg: MailDataRequired = {
      to: to,
      from: "team@noya.ai",
      subject: subject,
      templateId: templateId,
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
}

export default SendGridController;