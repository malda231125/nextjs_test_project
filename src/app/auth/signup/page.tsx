import { signUpWithEmail } from "../actions";
import { AuthLayout } from "@/components/ui/auth-layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <AuthLayout
      title="회원가입"
      subtitle="이메일 인증 후 로그인하면 바로 사용 가능합니다."
      message={message}
      altHref="/auth/login"
      altLabel="이미 계정이 있나요? 로그인"
    >
      <Card>
        <form action={signUpWithEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="비밀번호 (6자 이상)" />
          </div>
          <Button type="submit" variant="secondary" className="w-full">
            회원가입
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
