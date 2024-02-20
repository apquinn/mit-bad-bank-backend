import { User } from "../models/user.mjs";
import { Transactions } from "../models/transactions.mjs";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class UserController {
  async validateUser(user) {
    let error = "";
    if (user.name === "") {
      error = "Name cannot be empty";
    } else if (user.email === "") {
      error = "Email cannot be empty";
    } else if (user.password === "") {
      error = "Password cannot be empty";
    } else if (user.userType === "") {
      error = "Please select a user type";
    }
    return error;
  }

  async signup(user) {
    const error = await this.validateUser(user);
    if (error === "") {
      try {
        if (!global.salt) {
          global.salt = await bcrypt.genSalt(10);
        }
        user.password = await bcrypt.hash(user.password, global.salt);

        let userData = await User.create(user);
        const token = jwt.sign(
          {
            email: userData.email,
            userType: userData.userType,
            id: userData._id,
          },
          process.env.JWT_SECRET
        );

        let newTransaction = new Transactions({
          type: "create user",
          name: user.name,
          email: user.email,
          dateTime: Date.now(),
        });
        await newTransaction.save();

        newTransaction = new Transactions({
          type: "login",
          name: user.name,
          email: user.email,
          action: "login",
          dateTime: Date.now(),
        });
        await newTransaction.save();

        return {
          email: userData.email,
          id: userData._id,
          token,
        };
      } catch (err) {
        console.log(err);
        return err;
      }
    }
    return error;
  }

  async login(email, password) {
    try {
      let dbUser = await User.findOne({ email: email });
      if (!dbUser) {
        throw new Error("User does not exist");
      }

      const isMatch = await bcrypt.compare(password, dbUser.password);
      if (!isMatch) {
        throw new Error("User name or password is incorrect");
      }

      const token = jwt.sign(
        { email: email, userType: dbUser.userType, id: dbUser._id },
        process.env.JWT_SECRET
      );

      return { email: dbUser.email, id: dbUser._id, token };
    } catch (err) {
      return { error: err.message };
    }
  }
}
