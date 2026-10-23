import type { Metadata } from "next";
import AuthView from "@/components/auth/AuthView";

export const metadata: Metadata = {
  title: "Log in or register - YojnaMitra",
};

export default function AuthPage() {
  return <AuthView />;
}