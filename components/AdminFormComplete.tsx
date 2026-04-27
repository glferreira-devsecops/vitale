'use client';

import { useCallback, useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { AlertCircle, Calendar, Package, Percent, Save, Star } from 'lucide-react';

import ImageUploader from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// Interface completa do produto com todos os campos
export interface CompleteProductForm {
  // Campos básicos
  name: string;
  slug: string;
  description: string;
  category: string;
  active: boolean;
  featured: boolean;

  // Preços
  price: number;
  price_pix: number;
  price_card: number;
  price_prazo?: number;
  currency: string;
  discount_percentage: number;
  discount_valid_until?: string;

  // Estoque e logística
  stock_quantity: number;
  min_stock_alert: number;
  weight_grams?: number;
  dimensions_cm?: string;

  // Fornecedor e fabricação
  supplier_id?: string;
  manufacturer?: string;
  lot_number?: string;
  expiration_date?: string;
  requires_prescription: boolean;

  // SEO e marketing
  seo_description?: string;
  seo_keywords?: string;
  tags?: string;

  // Imagens
  images: string;
}

export async function completeProductSubmit(data: CompleteProductForm, product?: any) {
  try {
    // Processar campos especiais
    const images = data.images ? data.images.split(',').map(img => img.trim()).filter(img => img) : [];
    const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const seoKeywords = data.seo_keywords ? data.seo_keywords.split(',').map(kw => kw.trim()).filter(kw => kw) : [];

    // Preparar dados para envio
    const productData = {
      ...data,
      images,
      tags,
      seo_keywords: seoKeywords,
      price: Number(data.price),
      price_pix: Number(data.price_pix),
      price_card: Number(data.price_card),
      price_prazo: data.price_prazo ? Number(data.price_prazo) : null,
      discount_percentage: Number(data.discount_percentage) || 0,
      stock_quantity: Number(data.stock_quantity) || 0,
      min_stock_alert: Number(data.min_stock_alert) || 5,
      weight_grams: data.weight_grams ? Number(data.weight_grams) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = product
      ? await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
      : await supabase.from('products').insert(productData);

    if (error) {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message, 
        variant: 'destructive' 
      });
      return false;
    } else {
      toast({ 
        title: 'Sucesso!', 
        description: product ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!' 
      });
      return true;
    }
  } catch (error) {
    toast({ 
      title: 'Erro inesperado', 
      description: 'Ocorreu um erro ao salvar o produto', 
      variant: 'destructive' 
    });
    return false;
  }
}

export default function AdminFormComplete({
  product,
  onCancel,
  onSuccess,
}: {
  product?: any;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<CompleteProductForm>({
    defaultValues: {
      // Valores padrão
      currency: 'BRL',
      active: true,
      featured: false,
      requires_prescription: false,
      discount_percentage: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      // Carregar dados do produto se fornecido
      ...(product && {
        ...product,
        images: Array.isArray(product.images) ? product.images.join(', ') : (product.images || ''),
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
        seo_keywords: Array.isArray(product.seo_keywords) ? product.seo_keywords.join(', ') : (product.seo_keywords || ''),
        discount_valid_until: product.discount_valid_until ? new Date(product.discount_valid_until).toISOString().split('T')[0] : '',
        expiration_date: product.expiration_date ? new Date(product.expiration_date).toISOString().split('T')[0] : '',
      }),
    }
  });

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar fornecedores
  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await supabase.from('suppliers').select('id, name');
      if (data) setSuppliers(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Gerar slug automaticamente baseado no nome
  const watchName = watch('name');
  useEffect(() => {
    if (watchName && !product) { // Só auto-gerar para produtos novos
      const slug = watchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug);
    }
  }, [watchName, setValue, product]);

  const onSubmit = async (data: CompleteProductForm) => {
    setIsLoading(true);
    const success = await completeProductSubmit(data, product);
    setIsLoading(false);
    
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const generateSlug = () => {
    const name = watch('name');
    if (name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-container" data-testid="admin-form-complete">
      <Tabs defaultValue="basic" className="space-y-lg">
        <TabsList className="tabs-list">
          <TabsTrigger value="basic" className="tab-trigger">Básico</TabsTrigger>
          <TabsTrigger value="pricing" className="tab-trigger">Preços</TabsTrigger>
          <TabsTrigger value="inventory" className="tab-trigger">Estoque</TabsTrigger>
          <TabsTrigger value="details" className="tab-trigger">Detalhes</TabsTrigger>
          <TabsTrigger value="seo" className="tab-trigger">SEO/Marketing</TabsTrigger>
        </TabsList>

        {/* Aba Básica */}
        <TabsContent value="basic" className="tab-content animate-fade-in">
          <Card className="card-primary">
            <CardHeader className="card-header">
              <CardTitle className="card-title">
                <Package className="h-5 w-5 text-primary" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content">
              <div className="grid-2-cols gap-md">
                <div className="form-group">
                  <Label htmlFor="name" className="form-label required">Nome do Produto</Label>
                  <Input 
                    id="name" 
                    {...register('name', { required: 'Nome é obrigatório' })} 
                    placeholder="Ex: Botox 100 Unidades"
                    className="input-primary"
                  />
                </div>
                <div className="form-group">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slug" className="form-label required">URL (Slug)</Label>
                    <Button 
                      type="button" 
                      onClick={generateSlug}
                      className="btn-secondary btn-sm"
                    >
                      Gerar
                    </Button>
                  </div>
                  <Input 
                    id="slug" 
                    {...register('slug', { required: 'Slug é obrigatório' })} 
                    placeholder="botox-100-unidades"
                    className="input-primary"
                  />
                </div>
              </div>

              <div className="form-group">
                <Label htmlFor="category" className="form-label required">Categoria</Label>
                <Select defaultValue={product?.category} {...register('category')}>
                  <SelectTrigger className="select-primary">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toxina Botulínica">Toxina Botulínica</SelectItem>
                    <SelectItem value="Bioestimulador">Bioestimulador</SelectItem>
                    <SelectItem value="Bioremodelador">Bioremodelador</SelectItem>
                    <SelectItem value="Skinbooster">Skinbooster</SelectItem>
                    <SelectItem value="Preenchedor">Preenchedor</SelectItem>
                    <SelectItem value="Fio Bioestimulador">Fio Bioestimulador</SelectItem>
                    <SelectItem value="Fio Bioestimulação">Fio Bioestimulação</SelectItem>
                    <SelectItem value="Microcânula">Microcânula</SelectItem>
                    <SelectItem value="Enzima">Enzima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" variant="required">Descrição</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Descrição detalhada do produto..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-2">
                  <input
                    id="active"
                    type="checkbox"
                    {...register('active')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="active">Produto Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="featured"
                    type="checkbox"
                    {...register('featured')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="featured">Produto em Destaque</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="requires_prescription"
                    type="checkbox"
                    {...register('requires_prescription')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="requires_prescription">Requer Prescrição</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Preços */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Configuração de Preços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price" variant="required">Preço Base (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price', { required: 'Preço base é obrigatório', valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_pix" variant="required">Preço PIX (R$)</Label>
                  <Input
                    id="price_pix"
                    type="number"
                    step="0.01"
                    {...register('price_pix', { required: 'Preço PIX é obrigatório', valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_card" variant="required">Preço Cartão (R$)</Label>
                  <Input
                    id="price_card"
                    type="number"
                    step="0.01"
                    {...register('price_card', { required: 'Preço cartão é obrigatório', valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price_prazo">Preço à Prazo (R$)</Label>
                  <Input
                    id="price_prazo"
                    type="number"
                    step="0.01"
                    {...register('price_prazo', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select defaultValue="BRL" {...register('currency')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Desconto</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="discount_percentage">Desconto (%)</Label>
                    <Input
                      id="discount_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register('discount_percentage', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_valid_until">Válido até</Label>
                    <Input
                      id="discount_valid_until"
                      type="date"
                      {...register('discount_valid_until')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Estoque */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Controle de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    {...register('stock_quantity', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_alert">Alerta de Estoque Mínimo</Label>
                  <Input
                    id="min_stock_alert"
                    type="number"
                    min="0"
                    {...register('min_stock_alert', { valueAsNumber: true })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weight_grams">Peso (gramas)</Label>
                  <Input
                    id="weight_grams"
                    type="number"
                    step="0.1"
                    min="0"
                    {...register('weight_grams', { valueAsNumber: true })}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions_cm">Dimensões (cm)</Label>
                  <Input
                    id="dimensions_cm"
                    {...register('dimensions_cm')}
                    placeholder="10 x 5 x 2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier_id">Fornecedor</Label>
                <Select defaultValue={product?.supplier_id} {...register('supplier_id')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum fornecedor</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Detalhes */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detalhes do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Fabricante</Label>
                  <Input
                    id="manufacturer"
                    {...register('manufacturer')}
                    placeholder="Nome do fabricante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lot_number">Número do Lote</Label>
                  <Input
                    id="lot_number"
                    {...register('lot_number')}
                    placeholder="LOT123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration_date">Data de Validade</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  {...register('expiration_date')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  {...register('tags')}
                  placeholder="botox, antirrugas, facial"
                />
                <p className="text-xs text-muted-foreground">
                  Tags para organização e busca interna
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">URLs das Imagens (separadas por vírgula)</Label>
                <Textarea
                  id="images"
                  {...register('images')}
                  placeholder="/images/produto1.jpg, /images/produto2.jpg"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  URLs das imagens do produto. Use o gerenciador de imagens abaixo para upload automático.
                </p>
              </div>

              {/* ImageUploader integrado */}
              <div className="border-t pt-4">
                <ImageUploader
                  productId={product?.id || 'new'}
                  productName={watch('name') || 'Novo Produto'}
                  currentImages={product?.images || []}
                  onImagesUpdate={newImages => {
                    setValue('images', newImages.join(', '));
                  }}
                  maxImages={10}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba SEO/Marketing */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                SEO e Marketing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_description">Meta Descrição (SEO)</Label>
                <Textarea
                  id="seo_description"
                  {...register('seo_description')}
                  placeholder="Descrição que aparecerá nos resultados de busca..."
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 160 caracteres. Esta descrição aparecerá nos resultados do Google.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_keywords">Palavras-chave SEO (separadas por vírgula)</Label>
                <Input
                  id="seo_keywords"
                  {...register('seo_keywords')}
                  placeholder="botox, toxina botulínica, antirrugas"
                />
                <p className="text-xs text-muted-foreground">
                  Palavras-chave relevantes para SEO e busca
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900">Dicas de SEO</h4>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• Use palavras-chave relevantes no nome e descrição</li>
                      <li>• Mantenha a meta descrição entre 120-160 caracteres</li>
                      <li>• Use imagens de alta qualidade com nomes descritivos</li>
                      <li>• Mantenha URLs (slugs) simples e descritivas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botões de ação */}
      <div className="form-actions">
        <Button 
          type="submit" 
          disabled={isSubmitting || isLoading}
          className="btn-primary btn-lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting || isLoading ? 'Salvando...' : (product ? 'Atualizar Produto' : 'Criar Produto')}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="btn-outline btn-lg"
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}