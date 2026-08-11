import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForgotPassword } from '@workspace/api-client-react';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  
  const forgotMutation = useForgotPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = (data: ForgotForm) => {
    forgotMutation.mutate({ data }, {
      onSuccess: () => {
        setSuccess(true);
      },
      onError: (err: any) => {
        toast({
          title: "Failed",
          description: err.message || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col p-6 bg-card text-card-foreground">
      <div className="mt-4 mb-8">
        <button onClick={() => setLocation('/login')} className="text-muted-foreground flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back to Login
        </button>
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-pixel text-primary mb-2">RECOVER ACCOUNT</h1>
        
        {success ? (
          <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-6 rounded-xl border border-green-200 dark:border-green-800 mt-8 text-center">
            <h2 className="font-bold mb-2">Check your email</h2>
            <p className="text-sm">We've sent password reset instructions to your email address.</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-8">Enter your email and we'll send you a link to reset your password.</p>

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

              <button 
                type="submit" 
                disabled={forgotMutation.isPending}
                className="w-full mt-4 bg-primary text-primary-foreground font-pixel py-4 px-4 rounded-xl pixel-corners border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all disabled:opacity-50"
              >
                {forgotMutation.isPending ? 'SENDING...' : 'SEND LINK'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}