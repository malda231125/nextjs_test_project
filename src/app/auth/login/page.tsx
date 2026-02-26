import { signInWithEmail } from "../actions";
import { AuthLayout } from "@/components/ui/auth-layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <AuthLayout
      title="로그인"
      subtitle="보안 영상 보관함에 접근하려면 로그인하세요."
      message={message}
      altHref="/auth/signup"
      altLabel="계정이 없나요? 회원가입"
    >
      <Card>
        <form action={signInWithEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" name="password" type="password" required minLength={6} placeholder="비밀번호 (6자 이상)" />
          </div>
          <Button type="submit" className="w-full">
            로그인
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
