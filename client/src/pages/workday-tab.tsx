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
import { RestaurantModal } from '@/components/modals/RestaurantModal';
import { apiRequest } from '@/lib/queryClient';
import { Pencil, Trash, ChevronLeft, ChevronRight, CalendarIcon, Calendar as CalendarFull, SaveAll, Sunrise, Store } from 'lucide-react';
import { formatPrice, formatTime } from '@/lib/utils';
import { type MenuItem, type Table, type DayTemplate, type Restaurant, type Menu, type TableLayout, type MenuCategory } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
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
import { TableLayoutModal } from '@/components/modals/TableLayoutModal';
import { TableLayoutsModal } from '@/components/modals/TableLayoutsModal';

export default function WorkdayTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [newDayDialogOpen, setNewDayDialogOpen] = useState(false);
  const [templateSelectionOpen, setTemplateSelectionOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState<number | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<number | null>(null);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<number | null>(null);
  const [templateMode, setTemplateMode] = useState<'create' | 'edit' | 'apply'>('create');
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [selectedTableLayoutId, setSelectedTableLayoutId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  
  // Date selection functionality
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayConfigExists, setDayConfigExists] = useState(false);

  // Add state for table layout selection
  const [tableLayoutSelectionOpen, setTableLayoutSelectionOpen] = useState(false);
  const [tableLayoutModalOpen, setTableLayoutModalOpen] = useState(false);

  // Fetch menus and table layouts
  const { data: menus = [] } = useQuery<Menu[]>({
    queryKey: ['/api/menus', selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return [];
      try {
        const response = await apiRequest(`/api/menus?restaurantId=${selectedRestaurantId}`);
        console.log('[DEBUG] Fetched menus for restaurant:', selectedRestaurantId, response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('[DEBUG] Error fetching menus:', error);
        return [];
      }
    },
    enabled: !!selectedRestaurantId,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  useEffect(() => {
    console.log('[DEBUG] selectedRestaurantId in WorkdayTab:', selectedRestaurantId);
  }, [selectedRestaurantId]);

  // Fetch table layouts for the selected restaurant
  const { data: tableLayouts = [], isLoading: isLoadingTableLayouts } = useQuery<TableLayout[]>({
    queryKey: ['/api/table-layouts', selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) {
        console.log('[DEBUG] No restaurant selected');
        return [];
      }
      try {
        const response = await apiRequest(`/api/table-layouts?restaurantId=${selectedRestaurantId}`);
        console.log('[DEBUG] Fetched table layouts:', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('[DEBUG] Error fetching table layouts:', error);
        return [];
      }
    },
    enabled: !!selectedRestaurantId,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Add debug log before the Table Layout Selection Modal
  console.log('Table Layouts from API:', tableLayouts);
  console.log('Is Loading Table Layouts:', isLoadingTableLayouts);
  const tableLayoutsList = Array.isArray(tableLayouts) ? tableLayouts : [];
  console.log('Table Layouts List:', tableLayoutsList);

  // Add debug log for table layouts
  useEffect(() => {
    console.log('[DEBUG] Current table layouts:', tableLayouts);
  }, [tableLayouts]);

  // Load selected restaurant from localStorage on mount
  useEffect(() => {
    const selectedRestaurant = localStorage.getItem('selectedRestaurant');
    if (selectedRestaurant) {
      const { id } = JSON.parse(selectedRestaurant);
      setSelectedRestaurantId(id);
      console.log('[DEBUG] Loaded restaurant ID from localStorage:', id);
    }
  }, []);

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

  // Fetch restaurants with proper error handling
  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/restaurants');
        console.log('[DEBUG] Fetched restaurants:', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('[DEBUG] Error fetching restaurants:', error);
        return [];
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

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
    mutationFn: (template: { name: string; date?: Date; isTemplate: boolean; menuItems: MenuItem[]; tables: Table[] }) => 
      apiRequest('/api/day-templates', {
        method: 'POST',
        body: {
          ...template,
          date: template.date ? template.date.toISOString() : new Date().toISOString(),
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
    mutationFn: ({ id, template }: { id: number; template: { name: string; date?: Date; isTemplate: boolean; menuItems: MenuItem[]; tables: Table[] } }) => 
      apiRequest(`/api/day-templates/${id}`, {
        method: 'PUT',
        body: {
          ...template,
          date: template.date ? template.date.toISOString() : new Date().toISOString(),
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
    // Initialize with empty template for the current day
    setEditingTemplate({
      id: 0,
      name: `Config for ${selectedDate.toLocaleDateString()}`,
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

  // Handle restaurant selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    console.log('[DEBUG] Selecting restaurant:', restaurant);
    setSelectedRestaurantId(restaurant.id);
    setSelectedMenuId(null); // Reset menu selection
    setSelectedTableLayoutId(null); // Reset table layout selection
    
    // Save to localStorage
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    
    // Dispatch event for app-level state update
    window.dispatchEvent(new Event('restaurantSelected'));
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
    queryClient.invalidateQueries({ queryKey: ['/api/table-layouts'] });
    
    setRestaurantModalOpen(false);
    toast({
      title: "Restaurant Selected",
      description: `${restaurant.name} has been selected.`,
    });
  };

  // Handle menu selection
  const handleMenuSelect = async (menuId: number) => {
    console.log('[DEBUG] Selecting menu:', menuId);
    setSelectedMenuId(menuId);
    
    try {
      // Fetch menu items for the selected menu
      const menuItems = await apiRequest(`/api/menus/${menuId}/items`);
      console.log('[DEBUG] Fetched menu items:', menuItems);

      if (!Array.isArray(menuItems)) {
        throw new Error('Invalid menu items response');
      }

      // Initialize expanded categories
      const categories = await apiRequest(`/api/menu-categories?menuId=${menuId}`);
      const initialExpandedState = categories.reduce((acc: Record<number, boolean>, category: MenuCategory) => {
        acc[category.id] = true;
        return acc;
      }, {});
      setExpandedCategories(initialExpandedState);

      // Update or create day template
      if (currentDayTemplate) {
        await updateTemplateMutation.mutateAsync({
          id: currentDayTemplate.id,
          template: {
            ...currentDayTemplate,
            date: new Date(currentDayTemplate.date),
            isTemplate: currentDayTemplate.isTemplate || false,
            menuItems: menuItems,
            tables: currentDayTemplate.tables || []
          }
        });
      } else {
        await createTemplateMutation.mutateAsync({
          name: `Config for ${selectedDate.toLocaleDateString()}`,
          date: selectedDate,
          isTemplate: false,
          menuItems: menuItems,
          tables: []
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
      });

      setMenuModalOpen(false);
      toast({
        title: "Success",
        description: "Menu applied successfully",
      });
    } catch (error) {
      console.error('[DEBUG] Error applying menu:', error);
      toast({
        title: "Error",
        description: "Failed to apply menu",
        variant: "destructive"
      });
    }
  };

  // Handle table layout selection
  const handleTableLayoutSelect = async (layoutId: number) => {
    console.log('[DEBUG] Selecting table layout:', layoutId);
    setSelectedTableLayoutId(layoutId);
    
    try {
      // Fetch tables for the selected layout
      const tables = await apiRequest(`/api/tables?layoutId=${layoutId}`);
      console.log('[DEBUG] Fetched tables for layout:', tables);

      if (!Array.isArray(tables)) {
        throw new Error('Invalid tables response');
      }

      // Update or create day template
      if (currentDayTemplate) {
        await updateTemplateMutation.mutateAsync({
          id: currentDayTemplate.id,
          template: {
            ...currentDayTemplate,
            date: new Date(currentDayTemplate.date),
            isTemplate: currentDayTemplate.isTemplate || false,
            menuItems: currentDayTemplate.menuItems || [],
            tables: tables
          }
        });
      } else {
        await createTemplateMutation.mutateAsync({
          name: `Config for ${selectedDate.toLocaleDateString()}`,
          date: selectedDate,
          isTemplate: false,
          menuItems: [],
          tables: tables
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/day-templates/date', selectedDate.toISOString().split('T')[0]] 
      });

      setTableLayoutSelectionOpen(false);
      toast({
        title: "Success",
        description: "Table layout applied successfully",
      });
    } catch (error) {
      console.error('[DEBUG] Error applying table layout:', error);
      toast({
        title: "Error",
        description: "Failed to apply table layout",
        variant: "destructive"
      });
    }
  };

  // Fetch menu categories for the selected menu
  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ['/api/menu-categories', selectedMenuId],
    queryFn: async () => {
      if (!selectedMenuId) return [];
      try {
        const response = await apiRequest(`/api/menu-categories?menuId=${selectedMenuId}`);
        console.log('[DEBUG] Fetched menu categories:', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('[DEBUG] Error fetching menu categories:', error);
        return [];
      }
    },
    enabled: !!selectedMenuId,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  return (
    <div className="p-4">
      {/* Restaurant Modal */}
      <RestaurantModal 
        open={restaurantModalOpen} 
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={handleSelectRestaurant}
      />
      
      {/* Day Selection Header */}
      <div className="flex items-center justify-between mb-4 mt-6">
        <div className="font-semibold text-lg">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => changeDay('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
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
            size="sm"
            onClick={() => changeDay('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-6">
        <Button 
          variant="outline"
          onClick={() => setMenuModalOpen(true)}
          className="flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Menu
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            if (!selectedRestaurantId) {
              toast({
                title: "No Restaurant Selected",
                description: "Please select a restaurant first.",
                variant: "destructive"
              });
              setRestaurantModalOpen(true);
              return;
            }
            setTableLayoutSelectionOpen(true);
          }}
          className="flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Tables
        </Button>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        {/* Menu for Today Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Menu for Today</h2>
          <Card>
            <CardContent className="p-4">
              {currentDayTemplate?.menuItems?.length ? (
                <div className="space-y-4">
                  {Object.entries(
                    currentDayTemplate.menuItems.reduce((acc, item) => {
                      const categoryId = item.categoryId || 'uncategorized';
                      if (!acc[categoryId]) {
                        acc[categoryId] = {
                          items: [],
                          name: categoryId === 'uncategorized' ? 'Uncategorized' : 
                            menuCategories.find(mc => mc.id === item.categoryId)?.name || 'Uncategorized'
                        };
                      }
                      acc[categoryId].items.push(item);
                      return acc;
                    }, {} as Record<string, { items: MenuItem[], name: string }>)
                  ).map(([categoryId, { items, name }]) => (
                    <div key={categoryId} className="border rounded">
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                        onClick={() => toggleCategory(categoryId === 'uncategorized' ? -1 : parseInt(categoryId))}
                      >
                        <div className="flex items-center">
                          <ChevronRight 
                            className={`h-4 w-4 mr-2 transition-transform ${
                              expandedCategories[categoryId === 'uncategorized' ? -1 : parseInt(categoryId)] 
                                ? 'transform rotate-90' 
                                : ''
                            }`} 
                          />
                          <h4 className="font-medium">{name}</h4>
                        </div>
                      </div>
                      {expandedCategories[categoryId === 'uncategorized' ? -1 : parseInt(categoryId)] && (
                        <div className="divide-y divide-slate-200">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2 px-3">
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-slate-500 text-sm">{formatPrice(item.price)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No menu selected for today. Click "Add Menu" to select a menu.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Restaurant Tables Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Restaurant Tables</h2>
          <Card>
            <CardContent className="p-4">
              {currentDayTemplate?.tables?.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentDayTemplate.tables.map((table) => (
                    <Card key={table.id} className="bg-white">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-lg">Table {table.number}</span>
                        </div>
                        <span className="text-sm text-slate-500">Label: {table.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No tables selected for today. Click "Add Tables" to select a table layout.
                </div>
              )}
            </CardContent>
          </Card>
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
              template: {
                ...data,
                menuItems: editingTemplate.menuItems || [],
                tables: editingTemplate.tables || []
              }
            });
          } else {
            createTemplateMutation.mutate({
              ...data,
              menuItems: [],
              tables: []
            });
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

      {/* Menu Selection Modal */}
      <Dialog open={menuModalOpen} onOpenChange={setMenuModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Menu</DialogTitle>
            <DialogDescription>
              Choose a menu to use for {selectedDate.toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            {menus.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground mb-2">No menus available.</p>
                <Button
                  onClick={() => {
                    setMenuModalOpen(false);
                    // TODO: Navigate to restaurant tab to create menu
                  }}
                >
                  Create Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {menus.map((menu) => (
                  <div 
                    key={menu.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-accent"
                    onClick={() => handleMenuSelect(menu.id)}
                  >
                    <div className="font-medium">{menu.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Layout Selection Modal */}
      <TableLayoutsModal
        open={tableLayoutSelectionOpen}
        onOpenChange={setTableLayoutSelectionOpen}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId) || null}
        onSelectLayout={(layout) => handleTableLayoutSelect(Number(layout.id))}
      />

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

      {/* Table Layout Modal */}
      <TableLayoutModal
        open={tableLayoutModalOpen}
        onOpenChange={setTableLayoutModalOpen}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId) || null}
      />
    </div>
  );
}