import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { type DayTemplate, type MenuItem, type Table } from '@shared/schema';

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

  const description = mode === 'create'
    ? 'Create a new day configuration or template for your restaurant.'
    : mode === 'edit'
      ? 'Edit your day configuration or template.'
      : 'Apply this template to a specific date.';

  const buttonText = mode === 'create'
    ? 'Create'
    : mode === 'edit'
      ? 'Save Changes'
      : 'Apply Template';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === 'apply'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={false}
              />
            </div>

            {mode !== 'apply' && (
              <FormField
                control={form.control}
                name="isTemplate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Save as reusable template</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Templates can be applied to multiple dates and don't appear in the calendar view
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedDate}
              >
                {isSubmitting ? 'Saving...' : buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}