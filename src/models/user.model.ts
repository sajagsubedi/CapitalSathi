import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface User extends Document {
  fullName: string;
  username: string;
  password: string;
  isPasswordCorrect: (password: string) => Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    fullName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const UserModel =
  (mongoose.models.User as mongoose.Model<User>) ||
  mongoose.model<User>("User", userSchema);  

export default UserModel;