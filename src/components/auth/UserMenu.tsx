import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield } from 'lucide-react';

export function UserMenu() {
  const { user, role, isAdmin, signOut } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono gap-2">
          {isAdmin ? (
            <Shield className="h-4 w-4 text-yellow-500" />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="hidden sm:inline max-w-32 truncate">
            {user.email}
          </span>
          <Badge variant={isAdmin ? 'default' : 'secondary'} className="font-mono text-xs">
            {role?.toUpperCase() || 'USER'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-xs">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut}
          className="font-mono text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
