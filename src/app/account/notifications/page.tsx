'use client';

import { useState, useEffect } from 'react';
import { notificationManager, NotificationType, NotificationChannel } from '@/lib/notificationManager';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuthFlow';
import { Separator } from '@/components/ui/separator';

interface NotificationTypeConfig {
  type: NotificationType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const notificationTypes: NotificationTypeConfig[] = [
  {
    type: 'transaction',
    title: 'Transaction Notifications',
    description: 'Get notified about card transactions and payment activity',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'security',
    title: 'Security Alerts',
    description: 'Important security notifications and login alerts',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'account',
    title: 'Account Updates',
    description: 'Changes to your account settings and profile',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'marketing',
    title: 'Marketing',
    description: 'Promotions, offers, and product updates',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'system',
    title: 'System Notifications',
    description: 'Important platform updates and announcements',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'card',
    title: 'Card Notifications',
    description: 'Virtual and physical card status and activity',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'wallet',
    title: 'Wallet Activity',
    description: 'Wallet balance and transaction updates',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'transfer',
    title: 'Transfer Alerts',
    description: 'Money transfers between accounts and users',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'reward',
    title: 'Rewards & Cashback',
    description: 'Earned rewards, cashback and loyalty program updates',
    icon: <Bell className="h-5 w-5" />
  },
  {
    type: 'promotion',
    title: 'Promotions',
    description: 'Limited time offers and special promotions',
    icon: <Bell className="h-5 w-5" />
  },
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preferences');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load preferences when user is available
  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;

      try {
        setLoading(true);
        const prefs = await notificationManager.getUserPreferences(user.id);
        setPreferences(prefs?.channels || {});
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Update preference for a specific notification type and channel
  const updatePreference = (type: NotificationType, channel: NotificationChannel, enabled: boolean) => {
    setPreferences((prev: any) => {
      const updated = { ...prev };
      
      if (!updated[type]) {
        updated[type] = {
          in_app: true,
          push: false,
          email: false,
          sms: false
        };
      }
      
      updated[type] = {
        ...updated[type],
        [channel]: enabled
      };
      
      return updated;
    });
  };

  // Save preferences
  const savePreferences = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const success = await notificationManager.updatePreferences(user.id, preferences);
      
      if (success) {
        toast({
          title: "Preferences saved",
          description: "Your notification preferences have been updated",
        });
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  // Request browser notification permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        
        if (permission === 'granted') {
          toast({
            title: "Permission granted",
            description: "You will now receive browser notifications",
          });
        } else {
          toast({
            title: "Permission denied",
            description: "Browser notifications will not be shown",
            variant: "error"
          });
        }
      } catch (error) {
        console.error('Error requesting permission:', error);
      }
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center p-8">
          <p>Please sign in to manage your notification preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Notification Settings</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="browser">Browser Settings</TabsTrigger>
          <TabsTrigger value="email">Email Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure which notifications you want to receive and how
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-5 gap-4 text-sm font-medium text-center border-b pb-2">
                    <div className="col-span-2">Notification Type</div>
                    <div>
                      <Bell className="h-4 w-4 mx-auto mb-1" />
                      In-App
                    </div>
                    <div>
                      <Smartphone className="h-4 w-4 mx-auto mb-1" />
                      Push
                    </div>
                    <div>
                      <Mail className="h-4 w-4 mx-auto mb-1" />
                      Email
                    </div>
                  </div>
                  
                  {notificationTypes.map((notificationType) => {
                    const typePrefs = preferences?.[notificationType.type] || {
                      in_app: true,
                      push: false,
                      email: false,
                      sms: false
                    };
                    
                    return (
                      <div key={notificationType.type} className="grid grid-cols-5 gap-4 items-center">
                        <div className="col-span-2">
                          <div className="flex items-center">
                            {notificationType.icon}
                            <div className="ml-2">
                              <div className="font-medium">{notificationType.title}</div>
                              <div className="text-xs text-muted-foreground">{notificationType.description}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={typePrefs.in_app}
                            onCheckedChange={(checked: boolean) => updatePreference(notificationType.type, 'in_app', checked)}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={typePrefs.push}
                            onCheckedChange={(checked: boolean) => updatePreference(notificationType.type, 'push', checked)}
                            disabled={browserPermission !== 'granted'}
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            checked={typePrefs.email}
                            onCheckedChange={(checked: boolean) => updatePreference(notificationType.type, 'email', checked)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button 
                onClick={savePreferences} 
                disabled={loading || saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="browser">
          <Card>
            <CardHeader>
              <CardTitle>Browser Notification Settings</CardTitle>
              <CardDescription>
                Configure browser push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Current permission status</h3>
                  <div className="flex items-center">
                    <div
                      className={`h-3 w-3 rounded-full mr-2 ${
                        browserPermission === 'granted' ? 'bg-green-500' :
                        browserPermission === 'denied' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}
                    />
                    <span>
                      {browserPermission === 'granted' ? 'Allowed' :
                       browserPermission === 'denied' ? 'Blocked' :
                       'Not set'}
                    </span>
                  </div>
                  {browserPermission === 'denied' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      You have blocked notifications for this site. Please update your browser settings to enable notifications.
                    </p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-4">Push notification settings</h3>
                  <div className="space-y-4">
                    {browserPermission !== 'granted' && browserPermission !== 'denied' && (
                      <div>
                        <Button onClick={requestBrowserPermission}>
                          Enable Browser Notifications
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-badges">Show unread badges</Label>
                      <Switch id="show-badges" checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quiet-hours">Quiet hours</Label>
                      <Switch id="quiet-hours" checked={false} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Email delivery preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="daily-digest">Receive daily digest</Label>
                      <Switch id="daily-digest" checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="marketing-emails">Marketing emails</Label>
                        <p className="text-sm text-muted-foreground">Receive special offers and promotions</p>
                      </div>
                      <Switch id="marketing-emails" checked={false} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="html-emails">Use HTML emails</Label>
                      <Switch id="html-emails" checked={true} />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Primary email address</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" className="mr-2">
                Unsubscribe from all
              </Button>
              <Button>
                Save Email Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
