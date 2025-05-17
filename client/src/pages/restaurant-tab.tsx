import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddMenuItemModal } from '@/components/modals/AddMenuItemModal';
import { AddTableModal } from '@/components/modals/AddTableModal';
import { DayTemplateModal } from '@/components/modals/DayTemplateModal';
import { apiRequest } from '@/lib/queryClient';
import { Pencil, Trash, ChevronLeft, ChevronRight, CalendarIcon, Calendar as CalendarFull, SaveAll, Sunrise } from 'lucide-react';
import { formatPrice, formatTime } from '@/lib/utils';
import { type MenuItem, type Table, type DayTemplate } from '@shared/schema';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RestaurantTab() {
  const queryClient = useQueryClient();
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newDayDialogOpen, setNewDayDialogOpen] = useState(false);
  const [templateSelectionOpen, setTemplateSelectionOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState<number | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<number | null>(null);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<number | null>(null);
  const [templateMode, setTemplateMode] = useState<'create' | 'edit' | 'apply'>('create');
  
  // Date selection functionality
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayConfigExists, setDayConfigExists] = useState(false);

  // Function to change the selected date
  const changeDay = (direction: 'next' | 'prev') => {
    const newDate = new Date(selectedDate);
    if (direction === 'next') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };
  
  // Format date for display
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Fetch menu items and tables
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
  });
  
  // Fetch day templates and templates
  const { data: dayTemplates = [] } = useQuery<DayTemplate[]>({
    queryKey: ['/api/day-templates'],
  });
  
  const { data: templates = [] } = useQuery<DayTemplate[]>({
    queryKey: ['/api/day-templates/templates'],
  });
  
  // Get template for the selected date
  const { 
    data: currentDayTemplate, 
    isLoading: isLoadingDayTemplate,
    isError: isDayTemplateError
  } = useQuery<DayTemplate>({
    queryKey: ['/api/day-templates/date', selectedDate?.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!selectedDate) return null;
      try {
        return await apiRequest(`/api/day-templates/date/${selectedDate.toISOString().split('T')[0]}`);
      } catch (error) {
        // If no template exists for this date, return null
        return null;
      }
    },
    enabled: !!selectedDate,
  });

  // Check if the selected day is a new day (no configuration exists)
  const isNewDay = !isLoadingDayTemplate && !currentDayTemplate;

  // Mutations for menu items
  const createMenuItemMutation = useMutation({
    mutationFn: (item: { name: string; price: number }) => 
      apiRequest('/api/menu-items', { 
        method: 'POST', 
        body: item 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setMenuModalOpen(false);
    }
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, item }: { id: number; item: { name: string; price: number } }) => 
      apiRequest(`/api/menu-items/${id}`, {
        method: 'PUT',
        body: item
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setMenuModalOpen(false);
      setEditingMenuItem(null);
    }
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/menu-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setConfirmDeleteMenu(null);
    }
  });

  // Mutations for tables
  const createTableMutation = useMutation({
    mutationFn: (table: { number: string; label: string }) => 
      apiRequest('/api/tables', {
        method: 'POST',
        body: table
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setTableModalOpen(false);
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, table }: { id: number; table: { number: string; label: string } }) => 
      apiRequest(`/api/tables/${id}`, {
        method: 'PUT',
        body: table
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setTableModalOpen(false);
      setEditingTable(null);
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setConfirmDeleteTable(null);
    }
  });

  // Mutations for day templates
  const createTemplateMutation = useMutation({
    mutationFn: (template: { name: string; date?: Date; isTemplate: boolean }) => 
      apiRequest('/api/day-templates', {
        method: 'POST',
        body: {
          ...template,
          date: template.date ? template.date.toISOString() : new Date().toISOString(),
          menuItems: menuItems,
          tables: tables
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates/templates'] });
      setTemplateModalOpen(false);
      // Invalidate current day template query
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
        });
      }
      setNewDayDialogOpen(false);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, template }: { id: number; template: { name: string; date?: Date; isTemplate: boolean } }) => 
      apiRequest(`/api/day-templates/${id}`, {
        method: 'PUT',
        body: {
          ...template,
          date: template.date ? template.date.toISOString() : new Date().toISOString(),
          menuItems: menuItems,
          tables: tables
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates/templates'] });
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      // Invalidate current day template query
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
        });
      }
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/day-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates/templates'] });
      setConfirmDeleteTemplate(null);
      // Invalidate current day template query
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
        });
      }
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: Date }) => 
      apiRequest(`/api/day-templates/${id}/apply`, {
        method: 'POST',
        body: { date: date.toISOString() }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      if (selectedDate) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
        });
      }
      setTemplateModalOpen(false);
      setTemplateSelectionOpen(false);
      setNewDayDialogOpen(false);
    }
  });

  // Handle edit menu item
  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuModalOpen(true);
  };

  // Handle edit table
  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setTableModalOpen(true);
  };

  // Handle edit template
  const handleEditTemplate = (template: DayTemplate) => {
    setEditingTemplate(template);
    setTemplateMode('edit');
    setTemplateModalOpen(true);
  };

  // Handle apply template
  const handleApplyTemplate = (template: DayTemplate) => {
    setEditingTemplate(template);
    setTemplateMode('apply');
    setTemplateModalOpen(true);
  };

  // Handle starting a new day when clicking "Bright New Day" button
  const handleStartNewDay = () => {
    setNewDayDialogOpen(true);
  };

  // Handle creating a new template for the current day from the "Bright New Day" dialog
  const handleCreateNewTemplate = () => {
    setNewDayDialogOpen(false);
    setEditingTemplate(null);
    const templateData = {
      name: `Config for ${selectedDate.toLocaleDateString()}`,
      date: selectedDate,
      isTemplate: false
    };
    // Initialize with empty template for the current day
    setEditingTemplate({
      id: 0,
      name: templateData.name,
      date: selectedDate.toISOString().split('T')[0],
      tables: [],
      menuItems: [],
      isTemplate: false
    });
    setTemplateMode('create');
    setTemplateModalOpen(true);
  };

  // Handle choosing a template for the current day
  const handleUseTemplate = () => {
    setNewDayDialogOpen(false);
    setTemplateSelectionOpen(true);
  };

  // Apply selected template to current day
  const applySelectedTemplate = () => {
    if (selectedTemplateId) {
      applyTemplateMutation.mutate({
        id: selectedTemplateId,
        date: selectedDate
      });
    }
  };

  // Date click handler
  const handleDateClick = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  // Check if we need to save current configuration as a new template
  const needToSaveTemplate = () => {
    if (!currentDayTemplate) return false;
    // If the current day configuration is not a template and has been modified
    return !currentDayTemplate.isTemplate;
  };

  return (
    <div className="p-4">
      {/* Day Selection Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="font-semibold text-lg">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          {isNewDay && <span className="ml-2 text-sm font-normal text-muted-foreground">(New Day)</span>}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => changeDay('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-9 p-0">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateClick}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => changeDay('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {isNewDay && (
            <Button onClick={handleStartNewDay} className="ml-2 bg-amber-500 hover:bg-amber-600">
              <Sunrise className="h-4 w-4 mr-2" />
              Bright New Day
            </Button>
          )}
          
          {needToSaveTemplate() && (
            <Button 
              variant="outline"
              onClick={handleCreateNewTemplate}
              className="ml-2"
            >
              <SaveAll className="h-4 w-4 mr-2" />
              Save New Template
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        {/* Menu Items Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Menu Items</h2>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingMenuItem(null);
                setMenuModalOpen(true);
              }}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {menuItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No menu items yet. Add your first menu item!
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-slate-500 text-sm">{formatPrice(item.price)}</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditMenuItem(item)}>
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteMenu(item.id)}
                        >
                          <Trash className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tables</h2>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingTable(null);
                setTableModalOpen(true);
              }}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Table
            </Button>
          </div>
          
          {tables.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-gray-500">
                No tables yet. Add your first table!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tables.map((table) => (
                <Card key={table.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-lg">Table {table.number}</span>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditTable(table)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive" 
                          onClick={() => setConfirmDeleteTable(table.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">Label: {table.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        

      </div>

      {/* Modals */}
      <AddMenuItemModal 
        open={menuModalOpen} 
        onOpenChange={setMenuModalOpen}
        onSubmit={(data) => {
          if (editingMenuItem) {
            updateMenuItemMutation.mutate({ id: editingMenuItem.id, item: data });
          } else {
            createMenuItemMutation.mutate(data);
          }
        }}
        editingItem={editingMenuItem}
        isSubmitting={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
      />

      <AddTableModal 
        open={tableModalOpen} 
        onOpenChange={setTableModalOpen}
        onSubmit={(data) => {
          if (editingTable) {
            updateTableMutation.mutate({ id: editingTable.id, table: data });
          } else {
            createTableMutation.mutate(data);
          }
        }}
        editingTable={editingTable}
        isSubmitting={createTableMutation.isPending || updateTableMutation.isPending}
      />
      
      <DayTemplateModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSubmit={(data) => {
          if (templateMode === 'apply' && editingTemplate) {
            applyTemplateMutation.mutate({ 
              id: editingTemplate.id, 
              date: data.date || new Date() 
            });
          } else if (editingTemplate) {
            updateTemplateMutation.mutate({ 
              id: editingTemplate.id, 
              template: data 
            });
          } else {
            createTemplateMutation.mutate(data);
          }
        }}
        editingTemplate={editingTemplate}
        isSubmitting={
          createTemplateMutation.isPending || 
          updateTemplateMutation.isPending || 
          applyTemplateMutation.isPending
        }
        mode={templateMode}
        menuItems={menuItems}
        tables={tables}
      />

      {/* Bright New Day Dialog */}
      <Dialog open={newDayDialogOpen} onOpenChange={setNewDayDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bright New Day</DialogTitle>
            <DialogDescription>
              How would you like to start this new day?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={handleCreateNewTemplate} 
              className="w-full justify-start text-left p-4 h-auto"
            >
              <div>
                <p className="font-medium">Start New Template</p>
                <p className="text-sm text-muted-foreground">Create a new configuration for today</p>
              </div>
            </Button>
            <Button 
              onClick={handleUseTemplate} 
              className="w-full justify-start text-left p-4 h-auto"
              variant="outline"
            >
              <div>
                <p className="font-medium">Use Restaurant Template</p>
                <p className="text-sm text-muted-foreground">Apply an existing template to today</p>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDayDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateSelectionOpen} onOpenChange={setTemplateSelectionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              Choose a template to apply to {selectedDate.toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground mb-2">No templates available.</p>
                <Button
                  onClick={() => {
                    setTemplateSelectionOpen(false);
                    setEditingTemplate(null);
                    setTemplateMode('create');
                    setTemplateModalOpen(true);
                  }}
                >
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div 
                    key={template.id} 
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'border-input'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.menuItems?.length || 0} items, {template.tables?.length || 0} tables
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateSelectionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applySelectedTemplate}
              disabled={!selectedTemplateId || applyTemplateMutation.isPending}
            >
              {applyTemplateMutation.isPending ? 'Applying...' : 'Apply Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Menu Item Dialog */}
      <AlertDialog open={confirmDeleteMenu !== null} onOpenChange={() => setConfirmDeleteMenu(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the menu item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteMenu !== null) {
                  deleteMenuItemMutation.mutate(confirmDeleteMenu);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMenuItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Table Dialog */}
      <AlertDialog open={confirmDeleteTable !== null} onOpenChange={() => setConfirmDeleteTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteTable !== null) {
                  deleteTableMutation.mutate(confirmDeleteTable);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTableMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Template Dialog */}
      <AlertDialog open={confirmDeleteTemplate !== null} onOpenChange={() => setConfirmDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this day template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteTemplate !== null) {
                  deleteTemplateMutation.mutate(confirmDeleteTemplate);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}