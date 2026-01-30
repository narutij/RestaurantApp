import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Login() {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (isSignup && !name)) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        // Create account request
        await addDoc(collection(db, 'accountRequests'), {
          name,
          email,
          password, // In production, hash this on server
          status: 'pending',
          role: null,
          requestedAt: new Date(),
          approvedAt: null,
          approvedBy: null
        });

        toast({
          title: "Request Submitted",
          description: "Your account request has been sent to admin for approval",
        });

        // Reset form and switch back to login
        setIsSignup(false);
        setName('');
        setEmail('');
        setPassword('');
      } else {
        await login(email, password);
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      }
    } catch (error: any) {
      toast({
        title: isSignup ? "Request Failed" : "Login Failed",
        description: error.message || `Failed to ${isSignup ? 'submit request' : 'log in'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 mb-4 rounded-full overflow-hidden bg-white shadow-lg">
            <img
              src="/icons/icon_main_white.jpg"
              alt="Vilko Puota"
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl">Vilko Puota</CardTitle>
          <p className="text-muted-foreground">Užsakymų valdymo sistema</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ?
                (isSignup ? "Submitting..." : "Signing in...") :
                (isSignup ? "Request Account" : "Sign In")
              }
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignup(!isSignup);
                setEmail('');
                setPassword('');
                setName('');
              }}
              className="text-sm"
            >
              {isSignup ? "Already have an account? Sign in" : "Need an account? Request access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}