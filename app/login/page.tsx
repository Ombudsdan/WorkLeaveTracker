"use client";
import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthFormLayout from "@/components/organisms/AuthFormLayout";
import Button from "@/components/atoms/Button";
import FormLabelledInput from "@/components/atoms/FormLabelledInput";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <AuthFormLayout
      title="Work Leave Tracker"
      subtitle="Sign in to manage your leave"
      onSubmit={handleSubmit}
      error={error}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            Register
          </Link>
        </>
      }
    >
      <FormLabelledInput
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        required
      />
      <FormLabelledInput
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        required
      />
      <Button type="submit" variant="primary" fullWidth disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </Button>
    </AuthFormLayout>
  );
}
