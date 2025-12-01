import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useSettings } from '../contexts/SettingsContext';

interface CompletoRule {
  categoryId: string;
  quantity: number;
  order: number;
}

interface Settings {
  completoPrice: number;
  completoRules: CompletoRule[];
  numberOfTables: number;
  currencySymbol: string;
}

interface Category {
  _id: string;
  name: string;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    completoPrice: 12.99,
    completoRules: [],
    numberOfTables: 6,
    currencySymbol: '$'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { refreshSettings } = useSettings();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsData, categoriesData] = await Promise.all([
        apiClient.getSettings(),
        apiClient.getCategories()
      ]);
      
      setSettings(settingsData);
      // Exclude "Completo" category from selection
      setCategories(categoriesData.filter((c: Category) => c.name !== 'Completo'));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    const maxOrder = settings.completoRules.length > 0
      ? Math.max(...settings.completoRules.map(r => r.order))
      : -1;

    setSettings({
      ...settings,
      completoRules: [
        ...settings.completoRules,
        {
          categoryId: '',
          quantity: 1,
          order: maxOrder + 1
        }
      ]
    });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = settings.completoRules.filter((_, i) => i !== index);
    // Reorder after removal
    newRules.forEach((rule, i) => {
      rule.order = i;
    });
    setSettings({ ...settings, completoRules: newRules });
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...settings.completoRules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newRules.length) return;

    // Swap
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    
    // Update order
    newRules.forEach((rule, i) => {
      rule.order = i;
    });

    setSettings({ ...settings, completoRules: newRules });
  };

  const handleRuleChange = (index: number, field: keyof CompletoRule, value: any) => {
    const newRules = [...settings.completoRules];
    newRules[index] = {
      ...newRules[index],
      [field]: field === 'quantity' ? parseInt(value) : value
    };
    setSettings({ ...settings, completoRules: newRules });
  };

  const handleSave = async () => {
    // Validate
    if (settings.completoPrice <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Completo price must be greater than 0',
      });
      return;
    }

    if (settings.numberOfTables < 1 || settings.numberOfTables > 50) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Number of tables must be between 1 and 50',
      });
      return;
    }

    for (const rule of settings.completoRules) {
      if (!rule.categoryId) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'All rules must have a category selected',
        });
        return;
      }
    }

    setSaving(true);
    try {
      await apiClient.updateSettings(settings);
      await refreshSettings(); // Refresh global settings
      toast({
        title: 'Success',
        description: 'Settings updated successfully. Completos will be regenerated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c._id === categoryId)?.name || 'Unknown';
  };

  const getPreviewCount = () => {
    if (settings.completoRules.length === 0) return 0;
    
    // Calculate combinations (example, actual would need product counts)
    return '?'; // Would need to fetch actual product counts per category
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure Completo generation rules</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic restaurant configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="numberOfTables" className="min-w-[150px]">
                  Number of Tables
                </Label>
                <Input
                  id="numberOfTables"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.numberOfTables}
                  onChange={(e) => setSettings({ ...settings, numberOfTables: parseInt(e.target.value) || 1 })}
                  className="max-w-[200px]"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="currencySymbol" className="min-w-[150px]">
                  Currency
                </Label>
                <Select
                  value={settings.currencySymbol}
                  onValueChange={(value) => setSettings({ ...settings, currencySymbol: value })}
                >
                  <SelectTrigger className="max-w-[200px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">Dolares - $</SelectItem>
                    <SelectItem value="Bs.">Bolivianos - Bs.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Completo Price Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Completo Price</CardTitle>
              <CardDescription>
                Fixed price for all auto-generated Completo products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="completoPrice" className="min-w-[100px]">
                  Price ({settings.currencySymbol})
                </Label>
                <Input
                  id="completoPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.completoPrice}
                  onChange={(e) => setSettings({ ...settings, completoPrice: parseFloat(e.target.value) || 0 })}
                  className="max-w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Completo Rules Configuration */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Completo Composition Rules</CardTitle>
                  <CardDescription>
                    Define which categories and how many products make a Completo
                  </CardDescription>
                </div>
                <Button onClick={handleAddRule} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.completoRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No rules configured. Add a rule to start generating Completos.</p>
                  <p className="text-sm mt-2">Example: 1 Sopa + 1 Segundo = Completo</p>
                </div>
              ) : (
                settings.completoRules
                  .sort((a, b) => a.order - b.order)
                  .map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50"
                    >
                      <div className="flex flex-col gap-2 min-w-[40px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveRule(index, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveRule(index, 'down')}
                          disabled={index === settings.completoRules.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <Badge variant="outline" className="min-w-[60px] justify-center">
                        {index + 1}
                      </Badge>

                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={rule.categoryId}
                            onValueChange={(value) => handleRuleChange(index, 'categoryId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category._id} value={category._id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={rule.quantity}
                            onChange={(e) => handleRuleChange(index, 'quantity', e.target.value)}
                          />
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))
              )}

              {settings.completoRules.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-semibold mb-2">Formula Preview:</h4>
                  <p className="text-sm">
                    {settings.completoRules
                      .sort((a, b) => a.order - b.order)
                      .map(rule => `${rule.quantity} ${getCategoryName(rule.categoryId)}`)
                      .join(' + ')}
                    {' = Completo'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    All combinations will be generated at {settings.currencySymbol}{settings.completoPrice.toFixed(2)} each
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

