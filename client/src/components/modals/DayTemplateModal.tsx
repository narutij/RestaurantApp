import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { type DayTemplate, type MenuItem, type Table } from '@shared/schema';
import { CalendarDays, X, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  date: z.date().optional(),
  isTemplate: z.boolean().default(false),
});

type DayTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  editingTemplate: DayTemplate | null;
  isSubmitting: boolean;
  menuItems: MenuItem[];
  tables: Table[];
  mode: 'create' | 'edit' | 'apply';
};

export function DayTemplateModal({
  open,
  onOpenChange,
  onSubmit,
  editingTemplate,
  isSubmitting,
  menuItems,
  tables,
  mode = 'create',
}: DayTemplateModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    editingTemplate?.date ? new Date(editingTemplate.date) : undefined
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingTemplate?.name || '',
      date: editingTemplate?.date ? new Date(editingTemplate.date) : undefined,
      isTemplate: editingTemplate?.isTemplate || false,
    },
  });

  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        date: editingTemplate.date ? new Date(editingTemplate.date) : undefined,
        isTemplate: editingTemplate.isTemplate || false,
      });
      setSelectedDate(editingTemplate.date ? new Date(editingTemplate.date) : undefined);
    } else {
      form.reset({
        name: '',
        date: undefined,
        isTemplate: false,
      });
      setSelectedDate(undefined);
    }
  }, [editingTemplate, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      ...values,
      date: selectedDate, 
    });
  };

  const title = mode === 'create' 
    ? 'Create Day Configuration' 
    : mode === 'edit' 
      ? 'Edit Day Configuration' 
      : 'Apply Template';

  const buttonText = mode === 'create'
    ? 'Create'
    : mode === 'edit'
      ? 'Save Changes'
      : 'Apply Template';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/20 rounded-xl">
                  <CalendarDays className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'apply' ? 'Select a date to apply' : 'Configuration details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 pt-2 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={mode === 'apply'}
                      className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-violet-500/50"
                      placeholder="e.g., Weekend Setup"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select Date</Label>
              <div className="bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="mx-auto"
                  disabled={false}
                />
              </div>
            </div>

            {mode !== 'apply' && (
              <FormField
                control={form.control}
                name="isTemplate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#181818] p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">Save as reusable template</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Templates can be applied to multiple dates
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedDate}
                className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-0"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {buttonText}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
