"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usersController } from "@/controllers/usersController";
import AuthFormLayout from "@/components/organisms/AuthFormLayout";
import Button from "@/components/atoms/Button";
import FormLabelledInput from "@/components/atoms/FormLabelledInput";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const result = await usersController.register({
      firstName,
      lastName,
      email,
      password,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Registration failed.");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <AuthFormLayout
      title="Work Leave Tracker"
      subtitle="Create your account"
      onSubmit={handleSubmit}
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormLabelledInput
          id="firstName"
          label="First Name"
          value={firstName}
          onChange={setFirstName}
          placeholder="Jane"
          required
        />
        <FormLabelledInput
          id="lastName"
          label="Last Name"
          value={lastName}
          onChange={setLastName}
          placeholder="Doe"
          required
        />
      </div>
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
        placeholder="Min. 8 characters"
        required
      />
      <FormLabelledInput
        id="confirmPassword"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="••••••••"
        required
      />
      <Button type="submit" variant="primary" fullWidth disabled={loading}>
        {loading ? "Creating account…" : "Create Account"}
      </Button>
    </AuthFormLayout>
  );
}
