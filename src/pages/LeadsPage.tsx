import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { LeadTable } from '@/components/dashboard/LeadTable';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lead } from '@/types';
import { useQuery } from '@tanstack/react-query';
import Loader from '@/components/ui/loader';
import { CreditPurchaseModal } from '@/components/credits/CreditPurchaseModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Euro, CreditCard } from 'lucide-react';

// Add search params type
interface SearchParams {
  tab: 'available' | 'my-leads';
  sort: string;
  filter: string;
}

export default function LeadsPage() {
  const { user } = useAuthStore();
  const [credits, setCredits] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const search = useSearch({ from: '/dashboard/leads' });
  const currentTab = search.tab || 'available';

  // Fetch available leads
  const { data: availableLeads, isLoading: isAvailableLoading } = useQuery({
    queryKey: ['available-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  // Fetch purchased leads
  const { data: purchasedLeads, isLoading: isPurchasedLoading } = useQuery({
    queryKey: ['purchased-leads'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('lead_purchases')
        .select('leads(*)')
        .eq('user_id', user.id);
      return data?.map(purchase => purchase.leads as unknown as Lead).flat() || [];
    }
  });

  // Fetch user credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();
      setCredits(data?.credits || 0);
    };
    fetchCredits();
  }, [user]);

  if (isAvailableLoading || isPurchasedLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-base px-4 py-2">
            <Euro className="w-4 h-4 mr-2" />
            {credits} credits
          </Badge>
          <Button onClick={() => setShowCreditModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Buy Credits
          </Button>
        </div>
      </div>

      <Tabs defaultValue={currentTab}>
        <TabsList>
          <TabsTrigger value="available">Beschikbare Leads</TabsTrigger>
          <TabsTrigger value="my-leads">Mijn Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <LeadFilters 
            onFilterChange={(filters) => console.log('filters', filters)}
            onSortChange={(sort) => console.log('sort', sort)}
          />
          <LeadTable 
            leads={availableLeads || []}
            isAdmin={false}
          />
        </TabsContent>

        <TabsContent value="my-leads">
          <LeadTable 
            leads={purchasedLeads || []}
            isAdmin={false}
          />
        </TabsContent>
      </Tabs>

      <CreditPurchaseModal 
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
      />
    </div>
  );
}