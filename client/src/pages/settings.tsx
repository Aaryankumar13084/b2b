import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Shield,
  Bell,
  Lock,
  Trash2,
  Download,
  LogOut,
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Manage your account settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information and profile settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage
                src={user?.profileImageUrl || undefined}
                alt={user?.firstName || "User"}
                className="object-cover"
              />
              <AvatarFallback className="text-xl">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1">
                {user?.subscriptionTier?.charAt(0).toUpperCase()}
                {user?.subscriptionTier?.slice(1) || "Free"}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">First Name</Label>
              <p className="font-medium">{user?.firstName || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Last Name</Label>
              <p className="font-medium">{user?.lastName || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Account Type</Label>
              <p className="font-medium capitalize">{user?.role || "User"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about your file processing
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-email-notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Usage Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when approaching credit limits
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-usage-alerts" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and promotions
              </p>
            </div>
            <Switch data-testid="switch-marketing-emails" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" size="sm" data-testid="button-2fa">
              <Lock className="w-4 h-4 mr-2" />
              Enable
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Active Sessions</Label>
              <p className="text-sm text-muted-foreground">
                Manage devices where you're currently logged in
              </p>
            </div>
            <Button variant="outline" size="sm" data-testid="button-sessions">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>Manage your data and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Export Data</Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your data
              </p>
            </div>
            <Button variant="outline" size="sm" data-testid="button-export-data">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Auto-Delete Files</Label>
              <p className="text-sm text-muted-foreground">
                Files are automatically deleted after the retention period
              </p>
            </div>
            <Badge variant="secondary">
              {user?.subscriptionTier === "enterprise" ? "Custom" : 
               user?.subscriptionTier === "pro" ? "24 hours" : "1 hour"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm" data-testid="button-delete-account">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <a href="/api/logout">
          <Button variant="outline" data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </a>
      </div>
    </div>
  );
}
