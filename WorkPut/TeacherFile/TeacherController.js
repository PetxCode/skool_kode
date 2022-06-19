const adminModel = require("../../model/AdminModel");
const teacherModel = require("../../model/TeacherModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../../utils/cloudinary");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");


const { google } = require("googleapis");

const CLIENT_ID =
	"922981826695-rviuikdrd4rk1kbsake7iusml8qb2ibc.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const CLIENT_TOKEN =
	"4/0AX4XfWg_vE6SU-W9lMKzVWPR14HQquZF4A3LWO0L0wlifqCQpzHUCNn5L9GTFZK5c1OCsg";
const CLIENT_REDIRECT = "https://developers.google.com/oauthplayground";

const oAuth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, CLIENT_REDIRECT);
oAuth.setCredentials({ refresh_token: CLIENT_TOKEN });

const createTeacher = async (req, res) => {
	try {
		const {
			fullName,
			schoolName,
			code,
			phoneNumber,
			email,
			password,
			displayName,
		} = req.body;

		const getURL = await adminModel.findOne({ code });

		if (getURL) {
			const getSchool = await adminModel.findById(getURL._id);

			const salt = await bcrypt.genSalt(10);
			const hashed = await bcrypt.hash(password, salt);

			if (getSchool.schoolName === schoolName && getSchool.code === code) {
				const newTeacher = new teacherModel({
					fullName,
					schoolName,
					schoolCode: code,
					phoneNumber,
					email,
					password: hashed,
					displayName,
					verifiedToken: getSchool.schoolCode,
				});

				newTeacher.admin = getSchool;
				newTeacher.save();

				getSchool.teacher.push(mongoose.Types.ObjectId(newTeacher._id));
				getSchool.save();

				
		const access = await oAuth.getAccessToken();
		const transport = nodemailer.createTransport({
			service: "gmail",
			auth: {
				type: "OAuth2",
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				refresh_token: CLIENT_TOKEN,
				accessToken: access.token,
			},
		});

		const mailOptions = {
			from: "Skuul ✉️ <skuulkude@gmail.com>",
					to: email,
					subject: "Account Verification",
					html: `
    <h3>
        This mail, is for account verification... Please use the <a
        href="http://localhost:3000/api/teacher/${newTeacher._id}/${code}"
        >Link to Finish</a> up your account creation 
    </h3>
    `,
				};

				transport.sendMail(mailOptions, (err, info) => {
					if (err) {
						console.log(err.message);
					} else {
						console.log(`message sent to your mail ${info.response}`);
					}
				});

				res.status(200).json({ message: "Please check your mail to continue" });
			} else {
				res.status(404).json({
					message: "Data fields are incorrect: School Name or School Code",
				});
			}
		} else {
			res.status(404).json({
				message:
					"something is wrong with the CODE... Please check and CORRECT!",
			});
		}
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const verifiedTeacher = async (req, res) => {
	try {
		const user = await teacherModel.findById(req.params.id);

		const getToken = crypto.randomBytes(5).toString("hex");
		if (user) {
			if (user.verifiedToken !== "") {
				await teacherModel.findByIdAndUpdate(
					user._id,
					{
						teacherCode: getToken,
						verifiedToken: "",
						verified: true,
					},
					{ new: true }
				);

				res
					.status(200)
					.json({ message: "Teacher's Account Verified, Proceed to Sign In" });
			}
		}
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const signinTeacher = async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await teacherModel.findOne({ email });

		if (user) {
			const check = await bcrypt.compare(password, user.password);
			if (check) {
				if (user.verified && user.verifiedToken === "") {
					const { password, ...info } = user._doc;

					const token = jwt.sign(
						{
							_id: user._id,
							verified: user.verified,
							status: user.status,
						},
						"ThisIsTheCode",
						{ expiresIn: "2d" }
					);

					res.status(200).json({
						message: `Welcome back ${user.fullName}`,
						data: { token, ...info },
					});
				} else {
					const getToken = crypto.randomBytes(5).toString("hex");
					const token = jwt.sign({ getToken }, "ThisIsTheCode");

					
		const access = await oAuth.getAccessToken();
		const transport = nodemailer.createTransport({
			service: "gmail",
			auth: {
				type: "OAuth2",
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				refresh_token: CLIENT_TOKEN,
				accessToken: access.token,
			},
		});

		const mailOptions = {
			from: "Skuul ✉️ <skuulkude@gmail.com>",
						to: email,
						subject: "Account re-Verification",
						html: `
            <h3>
                This mail, is for account verification... Please use the <a
                href="http://localhost:2331/api/teacher/${user._id}/${user.schoolCode}"
                >Link to Finish</a> up your account creation 
            </h3>
            `,
					};

					transport.sendMail(mailOptions, (err, info) => {
						if (err) {
							console.log(err.message);
						} else {
							console.log(`message sent to your mail ${info.response}`);
						}
					});

					res.status(200).json({
						message:
							"Please goto your mail to verify your account before you can sign in",
					});
				}
			} else {
				res.status(404).json({ message: "Password isn't correct" });
			}
		} else {
			res.status(404).json({ message: "user isn't present" });
		}
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const getTeacherSchool = async (req, res) => {
	try {
		// const users = await teacherModel.findById(req.params.id);

		const users = await teacherModel.findById(req.params.id).populate("admin");
		res.status(200).json({ message: "Teacher found", data: users });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const getTeachers = async (req, res) => {
	try {
		const users = await teacherModel.find().sort({ createdAt: -1 });
		res.status(200).json({ message: "Teachers found", data: users });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const getTeacher = async (req, res) => {
	try {
		const users = await teacherModel.findById(req.params.id).populate("admin");
		res.status(200).json({ message: "Teacher found", data: users });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const deleteTeacher = async (req, res) => {
	try {
		const getTeacher = await adminModel.findById(req.params.id);
		const remove = await teacherModel.findByIdAndRemove(req.params.teacher);

		getTeacher.teacher.pull(remove);
		getTeacher.save();

		res.status(200).json({ message: "School deleted" });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const updateTeacher = async (req, res) => {
	try {
		const { gender, profile, fullName, phoneNumber, displayName } = req.body;

		const image = await cloudinary.uploader.upload(req.file.path);

		const users = await teacherModel.findByIdAndUpdate(
			req.params.id,
			{
				gender,
				profile,
				fullName,
				schoolName,
				phoneNumber,
				displayName,
				avatar: image.secure_url,
				avatarID: image.public_id,
			},
			{ new: true }
		);
		res.status(200).json({ message: "teacher profile updated", data: users });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const newPasswordRequest = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await teacherModel.findOne({ email });

		if (user) {
			if (user.verified && user.verifiedToken === "") {
				const getToken = crypto.randomBytes(10).toString("hex");
				const token = jwt.sign({ getToken }, "ThisIsTheCode");

				const code = `schoolCode: ${token} ${getToken}`;

				await teacherModel.findByIdAndUpdate(
					user._id,
					{ verifiedToken: code },
					{ new: true }
				);

				
		const access = await oAuth.getAccessToken();
		const transport = nodemailer.createTransport({
			service: "gmail",
			auth: {
				type: "OAuth2",
				clientId: CLIENT_ID,
				clientSecret: CLIENT_SECRET,
				refresh_token: CLIENT_TOKEN,
				accessToken: access.token,
			},
		});

		const mailOptions = {
			from: "Skuul ✉️ <skuulkude@gmail.com>",
					to: email,
					subject: "Reset Password Request",
					html: `
            <h3>
                This mail, is sent because you requested for a password reset... Please use the <a
                href="http://localhost:2331/api/teacher/reset/${user._id}/${token}"
                >Link to Finish</a> up your password reset request!  
            </h3>
            `,
				};

				transport.sendMail(mailOptions, (err, info) => {
					if (err) {
						console.log(err.message);
					} else {
						console.log(`message sent to your mail ${info.response}`);
					}
				});

				res.status(200).json({
					message:
						"Please goto your mail to verify your account before you can sign in",
				});
			} else {
				res
					.status(404)
					.json({ message: "Please try to verify your account first" });
			}
		}
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

const passwordReset = async (req, res) => {
	try {
		const { password } = req.body;

		const salt = await bcrypt.genSalt(10);
		const hashed = await bcrypt.hash(password, salt);

		const user = await teacherModel.findById(req.params.id);

		if (user) {
			if (user.verified && user.verifiedToken !== "") {
				await adminModel.findByIdAndUpdate(
					user._id,
					{
						password: hashed,
						verifiedToken: "",
					},
					{ new: true }
				);
			}
		}

		res.status(200).json({ message: "School's password has been changed" });
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

module.exports = {
	createTeacher,
	verifiedTeacher,
	signinTeacher,
	getTeacher,
	deleteTeacher,
	updateTeacher,
	passwordReset,
	newPasswordRequest,
	getTeachers,
	getTeacherSchool,
};
