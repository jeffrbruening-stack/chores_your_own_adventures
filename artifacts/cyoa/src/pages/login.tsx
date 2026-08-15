import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLoginAdult } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  
  const loginMutation = useLoginAdult();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation('/home');
      },
      onError: (err: any) => {
        toast({
          title: "Login Failed",
          description: err.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 bg-card text-card-foreground">
      <div className="mt-4 mb-8">
        <button onClick={() => setLocation('/')} className="text-muted-foreground flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-pixel text-primary mb-2">WELCOME BACK</h1>
        <p className="text-muted-foreground mb-8">Enter your credentials to continue your adventure.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold block">EMAIL ADDRESS</label>
            <input 
              type="email" 
              {...register('email')}
              className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="hero@example.com"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold block">PASSWORD</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                {...register('password')}
                className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary font-bold">Forgot?</Link>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full mt-4 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
          >
            {loginMutation.isPending ? 'LOADING...' : 'LOGIN'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm">
          Don't have an account? <Link href="/register" className="text-primary font-bold">Create one</Link>
        </p>
      </div>
    </div>
  );
}