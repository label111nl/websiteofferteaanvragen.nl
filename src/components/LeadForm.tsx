import React from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Lead } from '../types';

interface LeadFormProps {
  onSubmit?: (lead: Partial<Lead>) => void;
}

type Step = {
  id: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    id: 'company',
    title: 'Over uw bedrijf',
    description: 'Vertel ons meer over uw organisatie'
  },
  {
    id: 'project',
    title: 'Project details',
    description: 'Wat voor website heeft u nodig?'
  },
  {
    id: 'budget',
    title: 'Budget',
    description: 'Wat is uw budget voor dit project?'
  },
  {
    id: 'contact',
    title: 'Contact gegevens',
    description: 'Hoe kunnen we u bereiken?'
  }
];

const predefinedBudgets = [
  '500-1000',
  '1000-2500',
  '2500-5000',
  '5000-10000',
  '10000-20000',
  '20000+'
];

export default function LeadForm({ onSubmit }: LeadFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [maxQuotes, setMaxQuotes] = React.useState<3 | 5>(3);
  const [loading, setLoading] = React.useState(false);
  const [customBudget, setCustomBudget] = React.useState(false);
  const [customBudgetRange, setCustomBudgetRange] = React.useState({
    min: '',
    max: ''
  });
  const [submitted, setSubmitted] = React.useState(false);

  const [formData, setFormData] = React.useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    project_description: '',
    budget_range: '',
    timeline: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalBudgetRange = customBudget 
        ? `${customBudgetRange.min}-${customBudgetRange.max}`
        : formData.budget_range;

      if (onSubmit) {
        onSubmit({
          ...formData,
          budget_range: finalBudgetRange,
          max_quotes: maxQuotes
        });
      }

      const { error } = await supabase.from('leads').insert([{
        ...formData,
        budget_range: finalBudgetRange,
        max_quotes: maxQuotes,
        status: 'pending',
        published: false,
        ai_verified: false,
        call_status: 'not_called',
      }]);

      if (error) throw error;
      
      setSubmitted(true);
      toast.success('Uw aanvraag is succesvol verzonden!');
      
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        project_description: '',
        budget_range: '',
        timeline: '',
      });
      setCurrentStep(0);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Bedankt voor uw aanvraag!</h2>
        <p className="text-gray-600 mb-6">
          Uw offerte aanvraag is succesvol ontvangen. Wij zullen deze zorgvuldig beoordelen en binnen 24 uur krijgt u een reactie van ons.
        </p>
        <p className="text-gray-600 mb-6">
          U ontvangt binnen enkele minuten een bevestigingsmail met de details van uw aanvraag.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Terug naar home
          <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
        </button>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                Bedrijfsnaam
              </label>
              <input
                type="text"
                name="company_name"
                id="company_name"
                required
                value={formData.company_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="project_description" className="block text-sm font-medium text-gray-700">
                Beschrijf uw project
              </label>
              <textarea
                name="project_description"
                id="project_description"
                rows={4}
                required
                value={formData.project_description}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Vertel ons over uw wensen en eisen voor de website..."
              />
            </div>
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
                Wanneer wilt u de website hebben?
              </label>
              <select
                name="timeline"
                id="timeline"
                required
                value={formData.timeline}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecteer een optie</option>
                <option value="Zo snel mogelijk">Zo snel mogelijk</option>
                <option value="1-2 maanden">1-2 maanden</option>
                <option value="2-3 maanden">2-3 maanden</option>
                <option value="3-6 maanden">3-6 maanden</option>
                <option value="6+ maanden">6+ maanden</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="customBudget"
                checked={customBudget}
                onChange={(e) => setCustomBudget(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="customBudget" className="ml-2 text-sm text-gray-700">
                Ik wil een eigen budget range opgeven
              </label>
            </div>

            {customBudget ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="minBudget" className="block text-sm font-medium text-gray-700">
                    Minimum (€)
                  </label>
                  <input
                    type="number"
                    id="minBudget"
                    value={customBudgetRange.min}
                    onChange={(e) => setCustomBudgetRange(prev => ({ ...prev, min: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    required={customBudget}
                  />
                </div>
                <div>
                  <label htmlFor="maxBudget" className="block text-sm font-medium text-gray-700">
                    Maximum (€)
                  </label>
                  <input
                    type="number"
                    id="maxBudget"
                    value={customBudgetRange.max}
                    onChange={(e) => setCustomBudgetRange(prev => ({ ...prev, max: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    required={customBudget}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {predefinedBudgets.map((budget) => (
                  <label
                    key={budget}
                    className={`
                      flex items-center justify-center p-4 border rounded-lg cursor-pointer
                      ${formData.budget_range === budget
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-200'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="budget_range"
                      value={budget}
                      checked={formData.budget_range === budget}
                      onChange={handleChange}
                      className="sr-only"
                      required={!customBudget}
                    />
                    <span>€{budget}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                Contactpersoon
              </label>
              <input
                type="text"
                name="contact_name"
                id="contact_name"
                required
                value={formData.contact_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mailadres
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Telefoonnummer
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aantal offertes
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={maxQuotes === 3}
                    onChange={() => setMaxQuotes(3)}
                    className="mr-2"
                  />
                  3 Offertes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={maxQuotes === 5}
                    onChange={() => setMaxQuotes(5)}
                    className="mr-2"
                  />
                  5 Offertes
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      {/* Progress bar */}
      <div className="mb-12">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Stap {currentStep + 1} van {steps.length}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full">
          <div
            className="h-3 bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep].title}</h2>
        <p className="mt-2 text-lg text-gray-600">{steps[currentStep].description}</p>
      </div>

      {/* Form fields with improved spacing */}
      <div className="mb-8 space-y-8">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center px-6 py-3 text-base font-medium rounded-md ${
            currentStep === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Vorige
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Volgende
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verzenden...' : 'Verstuur aanvraag'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>
    </form>
  );
}