import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
} from "@/components/neshastyar/NeshastyarUi";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("لطفاً ایمیل خود را وارد کنید.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001/api";
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setSuccessMsg("لینک بازنشانی رمز عبور به ایمیل شما ارسال شد.");
      } else {
        setErrorMsg(data.message || "خطا در ارسال ایمیل بازنشانی رمز عبور.");
      }
    } catch {
      setErrorMsg("خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-[#FBF9F4] px-6 py-8 text-[#1C1B18]"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-bold text-[#1C1B18]">
            بازیابی رمز عبور
          </h1>
          <p className="mt-1.5 text-[14px] text-[#404848]">
            ایمیل حساب خود را وارد کنید
          </p>
        </div>

        <NeshastyarCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <NeshastyarField
              label="ایمیل"
              type="email"
              dir="ltr"
              placeholder="example@mail.com"
              value={email}
              onChange={setEmail}
              disabled={isLoading}
              required
            />

            {errorMsg ? (
              <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
            ) : null}

            {successMsg ? (
              <p className="text-[13px] text-[#0D4D4D]">{successMsg}</p>
            ) : null}

            <NeshastyarPrimaryButton
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              ارسال لینک بازیابی
            </NeshastyarPrimaryButton>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-[14px] font-medium text-[#0D4D4D] hover:text-[#0F766E]"
            >
              بازگشت به ورود
            </Link>
          </div>
        </NeshastyarCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
