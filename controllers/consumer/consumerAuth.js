import jwt from "jsonwebtoken";
import Consumer from "../../modules/consumer/Consumer.js";

/**
 * ENV FLAGS
 * OTP_TEST_MODE=true   → enable test OTP
 * OTP_TEST_MODE=false  → production
 * OTP_TEST_CODE=123456
 */
const isTestOtpMode = process.env.OTP_TEST_MODE === "true";
const TEST_OTP = process.env.OTP_TEST_CODE || "123456";

// --------------------------------------------------
// REGISTER CONSUMER (after OTP verified)
// --------------------------------------------------
export const registerConsumer = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const consumer = await Consumer.findOne({ mobile });
    if (!consumer || !consumer.isVerified) {
      return res.status(400).json({ message: "Mobile not verified with OTP" });
    }

    consumer.name = name || consumer.name;
    consumer.email = email || consumer.email;

    await consumer.save();

    const token = jwt.sign(
      { id: consumer._id, mobile: consumer.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Consumer registered successfully",
      consumer,
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --------------------------------------------------
// SEND OTP (UNCHANGED)
// --------------------------------------------------
export const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    let consumer = await Consumer.findOne({ mobile });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    if (consumer) {
      consumer.otp = otp;
      consumer.otpExpiry = expiry;
      await consumer.save();
    } else {
      consumer = await Consumer.create({
        mobile,
        otp,
        otpExpiry: expiry,
        isVerified: false,
      });
    }

    // ⚠️ SMS integration here in production
    const sent = { mobileNo: mobile, otpNo: otp };

    return res.json({
      message: "OTP sent successfully",
      isExistingUser: Boolean(consumer.businessName && consumer.ownerName),
      sent,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error sending OTP",
      error: err.message,
    });
  }
};

// --------------------------------------------------
// VERIFY OTP (UPDATED WITH TEST MODE)
// --------------------------------------------------
export const verifyConsumerOtp = async (req, res) => {
  try {
    const {
      mobile,
      otp,
      businessName,
      ownerName,
      businessCategory,
      accountType,
      location,
    } = req.body;

    const brandLogo = req.file ? req.file.path : req.body.brandLogo;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP are required" });
    }

    let consumer = await Consumer.findOne({ mobile });

    // 🔹 In TEST MODE, auto-create consumer if not exists
    if (!consumer && isTestOtpMode) {
      consumer = await Consumer.create({
        mobile,
        isVerified: false,
      });
    }

    if (!consumer) {
      return res.status(404).json({ message: "Consumer not found" });
    }

    // --------------------------------------------------
    // OTP VERIFICATION
    // --------------------------------------------------
    if (!isTestOtpMode) {
      // 🔵 PRODUCTION OTP CHECK
      if (
        consumer.otp !== otp ||
        !consumer.otpExpiry ||
        consumer.otpExpiry < new Date()
      ) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } else {
      // 🟡 TEST OTP CHECK
      if (otp !== TEST_OTP) {
        return res.status(400).json({ message: "Invalid test OTP" });
      }
    }

    // --------------------------------------------------
    // CLEAN OTP (skip DB writes in test mode)
    // --------------------------------------------------
    if (!isTestOtpMode) {
      consumer.otp = undefined;
      consumer.otpExpiry = undefined;
    }

    consumer.isVerified = true;

    let profileCompletedNow = false;

    // --------------------------------------------------
    // PROFILE COMPLETION LOGIC
    // --------------------------------------------------
    if (!consumer.businessName || !consumer.ownerName) {
      if (businessName && ownerName) {
        consumer.businessName = businessName;
        consumer.ownerName = ownerName;
        consumer.businessCategory = businessCategory;
        consumer.location = location;
        consumer.accountType = accountType || consumer.accountType;
        if (brandLogo) {
          consumer.brandLogo = brandLogo;
        }

        profileCompletedNow = true;
      } else {
        await consumer.save();

        const token = jwt.sign(
          { id: consumer._id, mobile: consumer.mobile },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.json({
          message:
            "OTP verified. Please complete profile (businessName, ownerName, brandLogo).",
          requireDetails: true,
          token,
          isExistingUser: false,
        });
      }
    }

    await consumer.save();

    // --------------------------------------------------
    // JWT
    // --------------------------------------------------
    const token = jwt.sign(
      { id: consumer._id, mobile: consumer.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "360d" }
    );

    return res.json({
      message: profileCompletedNow
        ? "Profile completed & login successful"
        : "Login successful",
      token,
      isExistingUser: true,
      testMode: isTestOtpMode,
      data: {
        _id: consumer._id,
        businessName: consumer.businessName,
        ownerName: consumer.ownerName,
        mobile: consumer.mobile,
        brandLogo: consumer.brandLogo,
        accountType: consumer.accountType,
        businessCategory: consumer.businessCategory,
        location: consumer.location,
        isVerified: consumer.isVerified,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error verifying OTP",
      error: err.message,
    });
  }
};

