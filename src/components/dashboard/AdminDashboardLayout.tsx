import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  Bell,
  Building2,
  DollarSign,
  BarChart3,
  BarChart,
} from "lucide-react";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "../NotificationBell";
import { LeadTable } from "./LeadTable";
import { useLeads } from "@/hooks/queries/useLeads";
import { Lead } from "@/types";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import formatDateToUpdate, { formatDate } from "@/lib/utils";
import Loader from "../ui/loader";
import { CreditSystem } from "./CreditSystem";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui";
import { set } from "date-fns";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

interface Stats {
  totalLeads: number;
  totalSpent: number;
  conversionRate: number;
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, signOut } = useAdminAuthStore();
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: leads = [] } = useLeads();
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [credits, setCredits] = useState<number>(0)
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
      totalLeads: 0,
      totalSpent: 0,
      conversionRate: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const search = useSearch({ from: '/admin' });

  const navigation = [
    {
      name: 'Overview',
      icon: BarChart,
      current: location.pathname === '/admin',
      href: '/admin',
    },
    {
      name: 'Leads',
      icon: FileText,
      current: location.pathname.includes('/leads'),
      dropdownItems: [
        { name: 'All Leads', href: '/admin/leads' },
        { name: 'Pending Leads', href: '/admin/leads?status=pending' },
        { name: 'Published Leads', href: '/admin/leads?status=published' },
      ]
    },
    {
      name: 'Users',
      icon: Users,
      current: location.pathname.includes('/users'),
      dropdownItems: [
        { name: 'All Users', href: '/admin/users' },
        { name: 'Active Users', href: '/admin/users?status=active' },
      ]
    },
    {
      name: 'Settings',
      icon: Settings,
      current: location.pathname.includes('/settings'),
      dropdownItems: [
        { name: 'General', href: '/admin/settings' },
        { name: 'Lead Matching', href: '/admin/settings/lead-matching' },
        { name: 'AI Configuration', href: '/admin/settings/ai' },
        { name: 'Platform', href: '/admin/settings/platform' },
      ]
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/admin/login' });
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handlePublishLead = async (
    id: string,
    publish: NonNullable<Lead["published"]>,
    price: number
  ) => {
    const { error } = await supabase
      .from("leads")
      .update({
        published: publish,
        published_at: formatDateToUpdate(new Date()),
        price: price,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating lead:", error.message);
      toast.success('Error updating lead');
      return;
    }

    queryClient.setQueryData<Lead[]>(
      ["leads"],
      (prev) =>
        prev?.map((lead) =>
          lead.id === id ? { ...lead, published: publish } : lead
        ) || []
    );
    toast.success('Lead is published successfully');
  };

  const handleCallStatusChange = async (
    id: string,
    status: NonNullable<Lead["call_status"]>
  ) => {
    const { error } = await supabase
      .from("leads")
      .update({
        call_status: status,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating lead:", error.message);
      return;
    }

    queryClient.setQueryData<Lead[]>(
      ["leads"],
      (prev) =>
        prev?.map((lead) =>
          lead.id === id ? { ...lead, call_status: status } : lead
        ) || []
    );
  };


  const handleStatusChange = async (
    id: string,
    status: NonNullable<Lead["status"]>
  ) => {
    const { error } = await supabase
      .from("leads")
      .update({
        status: status,
        // approved_at: formatDateToUpdate(new Date()),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating lead:", error.message);
      return;
    }

    queryClient.setQueryData<Lead[]>(
      ["leads"],
      (prev) =>
        prev?.map((lead) =>
          lead.id === id ? { ...lead, status: status } : lead
        ) || []
    );
  };

  useEffect(() => {
    setLoading(true);
    if (leads.length > 0) {
      setFilteredLeads(leads);
      setLoading(false);
    }
  }, [leads]);

  useEffect(() => {
    const filterLeads = () => {
      if (search) {
        const status = search.status;
        if (status === "pending") {
          setFilteredLeads(leads.filter((lead) => lead.status === "pending"));
        } else if (status === "published") {
          setFilteredLeads(leads.filter((lead) => lead.published === true));
        } else {
          setFilteredLeads(leads);
        }
      }
    };

    filterLeads();
  }, [location,search]);

   const fetchDashboardData = async () => {
     if (!user) return;
     setLoadingStats(true);
     try {
       // Fetch user's credits
      const { data: credits, error: userError } = await supabase
         .from("users")
         .select("credits")
         .eq("id", user.id)
         .single(); // Use .single() to get a single record
    
       if (userError) throw userError;
       
       // Fetch lead purchases
       const { data: purchases, error: purchasesError } = await supabase
         .from('lead_purchases')
         .select('*')
         .eq('user_id', user.id);
 
       if (purchasesError) throw purchasesError;
 
       // Fetch quotes
       const { data: quotes, error: quotesError } = await supabase
         .from('quotes')
         .select('*, leads(*)')
         .eq('marketer_id', user.id)
         .order('created_at', { ascending: false });
 
       if (quotesError) throw quotesError;
 
 
 
      //  Calculate stats
       const totalLeads = leads?.length;
       const totalSpent = totalLeads * 2; // 2 credits per lead
       const successfulQuotes = quotes?.filter(q => q.status === 'accepted').length || 0;
       const conversionRate = totalLeads > 0 ? (successfulQuotes / totalLeads) * 100 : 0;
 
       setStats({
         totalLeads,
         totalSpent,
         conversionRate,
       });

      setCredits(credits?.credits || 0)
     } catch (error) {
       console.error('Error fetching dashboard data:', error);
     } finally {
      //  setLoading(false);
       setLoadingStats(false);
     }
   };
 
   useEffect(() => {
    if (user && leads && leads.length > 0) {
      fetchDashboardData();
    }
  }, [user, leads]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b mr-1">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-16 px-4 border-b">
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                  <div key={item.name}>
                    {item.dropdownItems ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => toggleDropdown(item.name)}
                          className={`
                            flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-md
                            ${item.current
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <div className="flex items-center">
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              openDropdown === item.name ? 'transform rotate-180' : ''
                            }`}
                          />
                        </button>
                        {openDropdown === item.name && (
                          <div className="pl-11 space-y-1">
                            {item.dropdownItems.map((subItem) => (
                              <Link
                                key={subItem.href}
                                to={subItem.href}
                                className={`
                                  block px-4 py-2 text-sm font-medium rounded-md
                                  ${location.pathname === subItem.href
                                    ? 'text-blue-700'
                                    : 'text-gray-600 hover:text-gray-900'
                                  }
                                `}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.href}
                        className={`
                          flex items-center px-4 py-2 text-sm font-medium rounded-md
                          ${item.current
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
              <div className="flex-shrink-0 p-4 border-t">
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <span className="text-sm text-gray-600">
            {admin?.email}
          </span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.dropdownItems ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={`
                        flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-md
                        ${item.current
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openDropdown === item.name ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openDropdown === item.name && (
                      <div className="pl-11 space-y-1">
                        {item.dropdownItems.map((subItem) => (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className={`
                              block px-4 py-2 text-sm font-medium rounded-md
                              ${location.pathname === subItem.href
                                ? 'text-blue-700'
                                : 'text-gray-600 hover:text-gray-900'
                              }
                            `}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.href}
                    className={`
                      flex items-center px-4 py-2 text-sm font-medium rounded-md
                      ${item.current
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="flex-shrink-0 p-4 border-t">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="lg:pl-64">
        <header className="hidden lg:block bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
            </div>
          </div>
        </header>
        {/* <main className="p-6"> */}
          {user ? 
            <main className="p-6">
            <div className="bg-white rounded-lg shadow mt-[15px]">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
                {loading ? (
                  <Loader />
                ) : (
                  <LeadTable
                    leads={filteredLeads || []}
                    onCallStatusChange={handleCallStatusChange}
                    onPublishLead={handlePublishLead}
                    isAdmin
                    onStatusChange={handleStatusChange}
                  />
                )}
              </div>
            </div>
          </main>
          : <div className="text-center mt-[30px]">Please login</div>}
          {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <CreditSystem credits={credits} loading={loadingStats}/>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Totaal Leads</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{loadingStats ?  
                          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                           : stats.totalLeads}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats.totalSpent} credits uitgegeven
                      </p>
                    </CardContent>
                  </Card>
          
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversie</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                      {loadingStats ?  
                          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                           : stats.conversionRate.toFixed(2) + "%"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Van leads naar klanten
                      </p>
                    </CardContent>
                  </Card>
          
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">ROI</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{loadingStats ?  
                          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
                           : '€' +(stats.totalSpent * 75).toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Geschatte waarde
                      </p>
                    </CardContent>
                  </Card>
                </div>
  
          <div className="bg-white rounded-lg shadow mt-[15px]">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
              {loading ? (
                <Loader />
              ) : (
                <LeadTable
                  leads={filteredLeads || []}
                  onCallStatusChange={handleCallStatusChange}
                  onPublishLead={handlePublishLead}
                  isAdmin
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          </div>
        </main> */}
      </div>
    </div>
  );
}

