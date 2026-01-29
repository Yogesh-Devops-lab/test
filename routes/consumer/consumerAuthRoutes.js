import express from "express";
import { sendOtp, verifyConsumerOtp } from "../../controllers/consumer/consumerAuth.js";
import { logoUpload } from "../../middleware/logoUploads.js";

const router = express.Router();

// --------------------------------------------------
// ENV FLAG
// --------------------------------------------------
const isTestOtpMode = process.env.OTP_TEST_MODE === "true";

// --------------------------------------------------
// SEND OTP / LOGIN
// --------------------------------------------------
router.post("/login", sendOtp);

// --------------------------------------------------
// VERIFY OTP
// Skip file upload middleware in TEST MODE
// --------------------------------------------------
router.post(
  "/verify-otp",
  isTestOtpMode ? (req, res, next) => next() : logoUpload.single("brandLogo"),
  verifyConsumerOtp
);

export default router;

