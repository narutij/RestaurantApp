import React, { useState, useEffect } from 'react';
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

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('[WorkdayTab] Error caught by boundary:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WorkdayTab] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
          <p className="text-gray-600">The Workday tab encountered an error.</p>
          <details className="mt-4">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="bg-gray-100 p-2 mt-2 text-sm overflow-auto">
              {this.state.error?.stack}
            </pre>
          </details>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function WorkdayTabContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuItemModalOpen, setMenuItemModalOpen] = useState(false);
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

  // Local selection inside menu selection modal before saving
  const [menuSelectionId, setMenuSelectionId] = useState<number | null>(null);

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

  // Date click handler
  const handleDateClick = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  return (
    <div className="p-4">
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
                            className={`h-4 w-4 mr-2 transition-transform ${expandedCategories[categoryId === 'uncategorized' ? -1 : parseInt(categoryId)]
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
                    className={`p-3 border rounded-md cursor-pointer hover:bg-accent ${menuSelectionId === menu.id ? 'border-primary bg-primary/5' : 'border-input'
                      }`}
                    onClick={() => setMenuSelectionId(menu.id)}
                  >
                    <div className="font-medium">{menu.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (menuSelectionId) {
                  // Handle menu selection
                  setMenuModalOpen(false);
                  setMenuSelectionId(null);
                }
              }}
              disabled={!menuSelectionId}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Layout Selection Modal */}
      <TableLayoutsModal
        open={tableLayoutSelectionOpen}
        onOpenChange={setTableLayoutSelectionOpen}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId) || null}
        onSelectLayout={(layout) => {
          setTableLayoutSelectionOpen(false);
          // Handle table layout selection
        }}
      />

      {/* Restaurant Modal */}
      <RestaurantModal
        open={restaurantModalOpen}
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={(restaurant) => {
          setSelectedRestaurantId(restaurant.id);
          setRestaurantModalOpen(false);
          localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
          window.dispatchEvent(new Event('restaurantSelected'));
          toast({
            title: "Restaurant Selected",
            description: `${restaurant.name} has been selected.`,
          });
        }}
      />
    </div>
  );
}

export default function WorkdayTab() {
  return (
    <ErrorBoundary>
      <WorkdayTabContent />
    </ErrorBoundary>
  );
}