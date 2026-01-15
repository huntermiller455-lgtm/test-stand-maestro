import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }).max(72),
});

export function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (action: 'login' | 'signup') => {
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      if (action === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Logged in successfully');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created! You can now log in.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-mono tracking-tight text-foreground">
            TEST STAND SCHEDULER
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to manage the test schedule
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-0">
            <TabsTrigger value="login" className="font-mono">LOGIN</TabsTrigger>
            <TabsTrigger value="signup" className="font-mono">SIGN UP</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-mono text-xs uppercase tracking-wide">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="operator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="font-mono text-xs uppercase tracking-wide">
                  Password
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit('login')}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full font-mono" 
                onClick={() => handleSubmit('login')}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                SIGN IN
              </Button>
            </CardFooter>
          </TabsContent>
          
          <TabsContent value="signup">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="font-mono text-xs uppercase tracking-wide">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="operator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="font-mono text-xs uppercase tracking-wide">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit('signup')}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full font-mono" 
                onClick={() => handleSubmit('signup')}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                CREATE ACCOUNT
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
