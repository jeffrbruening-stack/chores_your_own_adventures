import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRegisterAdult } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  
  const registerMutation = useRegisterAdult();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({ 
      data: {
        email: data.email,
        password: data.password,
        displayName: data.displayName
      } 
    }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        setLocation('/home');
      },
      onError: (err: any) => {
        toast({
          title: "Registration Failed",
          description: err.message || "An error occurred",
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
        <h1 className="text-2xl font-pixel text-primary mb-2">CREATE PARTY</h1>
        <p className="text-muted-foreground mb-8">Create your parent/guardian account to start the adventure.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold block">DISPLAY NAME</label>
            <input 
              type="text" 
              {...register('displayName')}
              className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Dad / Mom / Guardian"
            />
            {errors.displayName && <p className="text-destructive text-sm">{errors.displayName.message}</p>}
          </div>

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
                placeholder="Min. 8 characters"
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold block">CONFIRM PASSWORD</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                {...register('confirmPassword')}
                className="w-full bg-input text-foreground px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="Repeat password"
              />
            </div>
            {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={registerMutation.isPending}
            className="w-full mt-8 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
          >
            {registerMutation.isPending ? 'LOADING...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm">
          Already have an account? <Link href="/login" className="text-primary font-bold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}