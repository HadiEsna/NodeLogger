import express from "express";

const success = (
  res: express.Response,
  {
    data,
    message,
  }: {
    data?: any;
    message: string;
  }
) => {
  return res.status(200).json({
    success: true,
    data: data,
    code: 200,
    message: message,
  });
};

const error = (res: express.Response, message: string) => {
  return res.status(400).json({
    success: false,
    error: "Error",
    code: 400,
    message: message,
  });
};

const unauthorized = (res: express.Response, message: string) => {
  return res.status(401).json({
    success: false,
    error: "Unauthorized",
    code: 401,
    message: message,
  });
};

const forbidden = (res: express.Response) => {
  return res.status(403).json({
    success: false,
    code: 403,
    error: "Forbidden, you don't have permission to access this resource.",
  });
};

const serverError = (res: express.Response, message: string) => {
  return res.status(500).json({
    success: false,
    error: "Internal Server Error",
    code: 500,
    message: message,
  });
};

const notFound = (res: express.Response, message: string) => {
  return res.status(404).json({
    success: false,
    error: "Not Found",
    code: 404,
    message: message,
  });
};

const badRequest = (res: express.Response, message: string) => {
  return res.status(400).json({
    success: false,
    error: "Bad Request",
    code: 400,
    message: message,
  });
};

const ResponseHelper = {
  success,
  error,
  unauthorized,
  forbidden,
  serverError,
  notFound,
  badRequest,
};

export default ResponseHelper;
