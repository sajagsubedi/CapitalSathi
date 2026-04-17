"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@/schemas/signUpSchema";
import { Loader2, Eye, EyeOff, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import axios, { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const { status } = useSession();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");
  const [username, setUsername] = useState("");

  const [debouncedUsername] = useDebounceValue(username, 400);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  // Username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername) return;

      setIsCheckingUsername(true);
      setUsernameMessage("");

      try {
        const response = await axios.get<{ message?: string }>(
          `/api/auth/check-username-unique?username=${debouncedUsername}`
        );

        setUsernameMessage(response?.data?.message || "");
      } catch (error) {
        console.log("error in check username", error);
        const axiosError = error as AxiosError<{ message?: string }>;
        setUsernameMessage(
          axiosError?.response?.data?.message || "Error checking username"
        );
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername]);

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    try {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("username", data.username);
      formData.append("password", data.password);

      const response = await axios.post<{ message?: string }>(
        "/api/auth/signup",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      toast.success(response.data.message || "Signup successful!");
      router.replace(`/signin`);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError?.response?.data?.message ||
        "There was a problem during signup";

      toast.error(errorMessage);
      setError("root", { message: errorMessage });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card rounded-xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Create Account
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Start your Trading Journal journey
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Global Error */}
            {errors.root && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {errors.root.message}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Enter your full name"
                {...register("fullName")}
                className="h-11 bg-input border-border focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <div className="relative">
                <Input
                  placeholder="Choose a username"
                  {...register("username")}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-input border-border focus-visible:ring-1 focus-visible:ring-primary"
                  disabled={isSubmitting}
                />
                {isCheckingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {!isCheckingUsername && usernameMessage && (
                <p
                  className={`text-xs ${
                    usernameMessage === "Username is available!"
                      ? "text-green-500"
                      : "text-destructive"
                  }`}
                >
                  {usernameMessage}
                </p>
              )}

              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  {...register("password")}
                  className="h-11 bg-input border-border pr-10 focus-visible:ring-1 focus-visible:ring-primary"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-base font-medium mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign up"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="px-6 pt-2 pb-8">
          <p className="text-sm text-muted-foreground text-center w-full">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}