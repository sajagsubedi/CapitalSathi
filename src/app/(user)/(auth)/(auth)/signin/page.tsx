"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/schemas/signInSchema";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import { z } from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    const result = await signIn("credentials", {
      redirect: false,
      username: data.username,
      password: data.password,
    });

    if (result?.error) {
      toast.error("Invalid credentials");
    } else {
      router.push("/");
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-card border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-semibold text-foreground leading-snug">
            Hey,
            <br />
            <span className="text-green-400">Welcome</span> back.
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                {...register("username")}
                className="bg-muted border-border focus-visible:ring-green-500"
              />
              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className="bg-muted border-border focus-visible:ring-green-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-0">
          <div className="flex items-center gap-2 w-full text-muted-foreground text-sm">
            <hr className="flex-1 border-border" />
            or
            <hr className="flex-1 border-border" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-green-400 underline underline-offset-2 hover:text-green-300">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}