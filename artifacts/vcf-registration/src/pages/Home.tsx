import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSubmitRegistration } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SiNutanix } from "react-icons/si"; // Just a placeholder for corporate logo
import { CheckCircle2, Download, Building2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Must be in E.164 format (e.g. +254712345678)"),
});

export default function Home() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const submitRegistration = useSubmitRegistration();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Strip spaces
    const phone = values.phone.replace(/\s+/g, '');
    
    submitRegistration.mutate({ data: { name: values.name, phone } }, {
      onSuccess: () => {
        setIsSuccess(true);
      },
      onError: (error) => {
        if (error.status === 409) {
          form.setError("phone", { type: "manual", message: "This phone number is already registered." });
        } else {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description: error.data?.message || "An unexpected error occurred. Please try again.",
          });
        }
      }
    });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-4 border border-primary/20 shadow-lg shadow-primary/5">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nutterx Technologies</h1>
          <p className="text-muted-foreground mt-2 font-medium">VCF Registration</p>
        </div>

        <Card className="border-white/10 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            {!isSuccess && (
              <>
                <CardTitle className="text-xl">Join the Network</CardTitle>
                <CardDescription>
                  Register your phone number to download the official Nutterx Technologies contact card.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Registration Successful</h2>
                <p className="text-muted-foreground mb-8">
                  Thank you for registering with Nutterx Technologies.
                </p>
                <Button asChild size="lg" className="w-full text-md h-12 shadow-lg shadow-primary/20">
                  <a href="/api/download-vcf" download="NUTTERX.vcf">
                    <Download className="mr-2 h-5 w-5" />
                    Download VCF
                  </a>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" className="bg-background/50 h-11" {...field} />
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
                          <Input placeholder="+254712345678" className="bg-background/50 h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11 text-md" disabled={submitRegistration.isPending}>
                    {submitRegistration.isPending ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Nutterx Technologies. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
