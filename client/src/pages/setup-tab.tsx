import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { AddMenuItemModal } from '@/components/modals/AddMenuItemModal';
import { AddTableModal } from '@/components/modals/AddTableModal';
import { DayTemplateModal } from '@/components/modals/DayTemplateModal';
import { apiRequest } from '@/lib/queryClient';
import { Pencil, Trash, CalendarIcon, Calendar as CalendarFull, SaveAll } from 'lucide-react';
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

export default function SetupTab() {
  const queryClient = useQueryClient();
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DayTemplate | null>(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState<number | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<number | null>(null);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [templateMode, setTemplateMode] = useState<'create' | 'edit' | 'apply'>('create');

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
  
  // Get current day template
  const { data: currentDayTemplate } = useQuery<DayTemplate>({
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
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/day-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/day-templates/templates'] });
      setConfirmDeleteTemplate(null);
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

  // Handle create day configuration
  const handleCreateDayConfig = () => {
    setEditingTemplate(null);
    setTemplateMode('create');
    setTemplateModalOpen(true);
  };

  // Date click handler
  const handleDateClick = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="p-4">
      <Tabs defaultValue="menu-tables" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="menu-tables">Menu & Tables</TabsTrigger>
          <TabsTrigger value="calendar">Calendar & Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="menu-tables">
          {/* Menu Items Section */}
          <div className="mb-8">
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
        </TabsContent>
        
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <CalendarFull className="mr-2 h-5 w-5" />
                  Restaurant Calendar
                </h2>
                <Button
                  size="sm"
                  onClick={handleCreateDayConfig}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Day Configuration
                </Button>
              </div>
              
              <Card className="mb-6">
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateClick}
                    className="rounded-md"
                  />
                </CardContent>
              </Card>
              
              {/* Selected Day Info */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium text-base mb-3">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Select a date'}
                  </h3>
                  
                  {currentDayTemplate ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{currentDayTemplate.name}</h4>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTemplate(currentDayTemplate)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                            onClick={() => setConfirmDeleteTemplate(currentDayTemplate.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <h5 className="text-sm font-medium mb-2">Menu Items ({currentDayTemplate.menuItems?.length || 0})</h5>
                          <div className="text-sm text-slate-500">
                            {currentDayTemplate.menuItems && currentDayTemplate.menuItems.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {currentDayTemplate.menuItems.slice(0, 3).map(item => (
                                  <li key={item.id}>{item.name}</li>
                                ))}
                                {currentDayTemplate.menuItems.length > 3 && (
                                  <li>+{currentDayTemplate.menuItems.length - 3} more items</li>
                                )}
                              </ul>
                            ) : (
                              <p>No menu items configured</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-2">Tables ({currentDayTemplate.tables?.length || 0})</h5>
                          <div className="text-sm text-slate-500">
                            {currentDayTemplate.tables && currentDayTemplate.tables.length > 0 ? (
                              <ul className="list-disc list-inside">
                                {currentDayTemplate.tables.slice(0, 3).map(table => (
                                  <li key={table.id}>Table {table.number} ({table.label})</li>
                                ))}
                                {currentDayTemplate.tables.length > 3 && (
                                  <li>+{currentDayTemplate.tables.length - 3} more tables</li>
                                )}
                              </ul>
                            ) : (
                              <p>No tables configured</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-500 mb-4">No configuration exists for this date</p>
                      <Button onClick={handleCreateDayConfig}>
                        Create Configuration
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Templates Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <SaveAll className="mr-2 h-5 w-5" />
                  Saved Templates
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateMode('create');
                    setTemplateModalOpen(true);
                  }}
                >
                  New Template
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  {templates.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      <p className="mb-4">No saved templates yet.</p>
                      <p className="text-sm mb-4">Templates can be reused for different days.</p>
                      <Button
                        onClick={() => {
                          setEditingTemplate(null);
                          setTemplateMode('create');
                          setTemplateModalOpen(true);
                        }}
                      >
                        Create Template
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {templates.map((template) => (
                        <div key={template.id} className="p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleApplyTemplate(template)}
                              >
                                Apply
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDeleteTemplate(template.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex text-sm text-slate-500 gap-x-4">
                            <span>{template.menuItems?.length || 0} items</span>
                            <span>{template.tables?.length || 0} tables</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
