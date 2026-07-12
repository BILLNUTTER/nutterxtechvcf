import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdminMe,
  useAdminLogout,
  useGetRegistrations,
  useDeleteRegistration,
  useGetSettings,
  useUpdateSettings,
  getGetRegistrationsQueryKey,
  getGetSettingsQueryKey,
  getGetAdminMeQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut,
  Search,
  Download,
  Trash2,
  Users,
  Settings as SettingsIcon,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company Name is required"),
  title: z.string().min(1, "Title is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  website: z.string().url("Invalid URL"),
  address: z.string().min(1, "Address is required"),
});

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Auth Guard
  const { data: adminUser, isError: isAuthError, isLoading: isAuthLoading } = useGetAdminMe({
    query: {
      retry: false,
      queryKey: getGetAdminMeQueryKey()
    }
  });

  useEffect(() => {
    if (isAuthError) {
      setLocation("/admin/login");
    }
  }, [isAuthError, setLocation]);

  const logout = useAdminLogout();
  
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/admin/login")
    });
  };

  // Registrations Data
  const { data: registrationsData, isLoading: isRegLoading } = useGetRegistrations(
    { search: debouncedSearch || undefined, page, limit },
    { query: { enabled: !!adminUser, queryKey: getGetRegistrationsQueryKey({ search: debouncedSearch || undefined, page, limit }) } }
  );

  const deleteRegistration = useDeleteRegistration();

  const handleDelete = (id: number) => {
    deleteRegistration.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Registration deleted successfully." });
        queryClient.invalidateQueries({ queryKey: getGetRegistrationsQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete registration." });
      }
    });
  };

  // Settings Data
  const { data: settingsData, isLoading: isSettingsLoading } = useGetSettings({
    query: { enabled: !!adminUser, queryKey: getGetSettingsQueryKey() }
  });

  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: "",
      title: "",
      phone: "",
      email: "",
      website: "",
      address: "",
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        companyName: settingsData.companyName,
        title: settingsData.title,
        phone: settingsData.phone,
        email: settingsData.email,
        website: settingsData.website,
        address: settingsData.address,
      });
    }
  }, [settingsData, form]);

  const onSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings updated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to update settings." });
      }
    });
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Skeleton className="w-[400px] h-[300px] rounded-xl" />
    </div>;
  }

  if (!adminUser) return null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded-lg border border-primary/30">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight">Nutterx Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block">
              Logged in as <strong className="text-foreground">{adminUser.username}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs defaultValue="registrations" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-card border h-11">
              <TabsTrigger value="registrations" className="gap-2">
                <Users className="w-4 h-4" />
                Registrations
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <SettingsIcon className="w-4 h-4" />
                VCF Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="registrations" className="m-0">
               <div className="flex gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <a href="/api/admin/registrations/export" download="registrations.csv">
                    <Download className="w-4 h-4" />
                    Export CSV
                  </a>
                </Button>
              </div>
            </TabsContent>
          </div>

          <TabsContent value="registrations" className="space-y-4 m-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card/50 shadow-sm border-white/10">
                <CardHeader className="pb-2">
                  <CardDescription>Total Registrations</CardDescription>
                  <CardTitle className="text-3xl">
                    {isRegLoading ? <Skeleton className="h-8 w-20" /> : registrationsData?.total || 0}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-white/10 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search name or phone..." 
                    className="pl-9 bg-background"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered On</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isRegLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-[180px]" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : registrationsData?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                          No registrations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      registrationsData?.data.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">{reg.name}</TableCell>
                          <TableCell className="font-mono text-sm">{reg.phone}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(reg.createdAt), "MMM d, yyyy h:mm a")}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Registration?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the registration for <strong>{reg.name}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(reg.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {registrationsData && registrationsData.total > limit && (
                <div className="p-4 border-t flex items-center justify-between bg-card/50">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, registrationsData.total)} of {registrationsData.total} entries
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page * limit >= registrationsData.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <Card className="max-w-2xl border-white/10 shadow-sm">
              <CardHeader>
                <CardTitle>VCF Contact Details</CardTitle>
                <CardDescription>
                  This information will be included in the downloaded VCF card when users register.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSettingsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input className="bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title</FormLabel>
                              <FormControl>
                                <Input className="bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input className="bg-background/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input className="bg-background/50" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input className="bg-background/50" type="url" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical Address</FormLabel>
                            <FormControl>
                              <Input className="bg-background/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={updateSettings.isPending}>
                        {updateSettings.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
