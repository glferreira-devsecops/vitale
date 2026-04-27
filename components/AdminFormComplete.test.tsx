import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminFormComplete, { completeProductSubmit } from './AdminFormComplete';

// Mock do react-hook-form
const mockRegister = vi.fn(() => ({}));
const mockHandleSubmit = vi.fn((fn) => (e: any) => {
  e?.preventDefault?.();
  return fn({});
});
const mockSetValue = vi.fn();
const mockWatch = vi.fn(() => '');

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: mockRegister,
    handleSubmit: mockHandleSubmit,
    setValue: mockSetValue,
    watch: mockWatch,
    formState: { isSubmitting: false }
  })
}));

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null
      })),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))
    }))
  }
}));

// Mock do toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

// Mock do ImageUploader
vi.mock('@/components/admin/ImageUploader', () => ({
  default: ({ onImagesUpdate }: { onImagesUpdate: (images: string[]) => void }) => (
    <div data-testid="image-uploader">
      <button onClick={() => onImagesUpdate(['test-image.jpg'])}>
        Add Image
      </button>
    </div>
  )
}));

describe('AdminFormComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização Básica', () => {
    it('deve renderizar formulário completo de produto', () => {
      render(<AdminFormComplete />);
      
      expect(screen.getByTestId('admin-form-complete')).toBeInTheDocument();
      expect(screen.getByText('Básico')).toBeInTheDocument();
      expect(screen.getByText('Preços')).toBeInTheDocument();
      expect(screen.getByText('Estoque')).toBeInTheDocument();
      expect(screen.getByText('Detalhes')).toBeInTheDocument();
      expect(screen.getByText('SEO/Marketing')).toBeInTheDocument();
    });

    it('deve renderizar campo de nome do produto', () => {
      render(<AdminFormComplete />);
      
      expect(screen.getByLabelText(/Nome do Produto/i)).toBeInTheDocument();
    });

    it('deve renderizar abas de navegação', () => {
      render(<AdminFormComplete />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
    });

    it('deve renderizar botão de submit', () => {
      render(<AdminFormComplete />);
      
      expect(screen.getByText(/Criar Produto/i)).toBeInTheDocument();
    });

    it('deve mostrar botão cancelar quando callback é fornecido', () => {
      const mockCancel = vi.fn();
      render(<AdminFormComplete onCancel={mockCancel} />);
      
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('deve ter aba de detalhes com ImageUploader', async () => {
      const user = userEvent.setup();
      render(<AdminFormComplete />);
      
      await user.click(screen.getByText('Detalhes'));
      
      expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    });
  });

  describe('Funcionalidades de Formulário', () => {
    it('deve chamar register para campos básicos', () => {
      render(<AdminFormComplete />);
      
      expect(mockRegister).toHaveBeenCalledWith('name', expect.any(Object));
      expect(mockRegister).toHaveBeenCalledWith('slug', expect.any(Object));
      expect(mockRegister).toHaveBeenCalledWith('description');
      expect(mockRegister).toHaveBeenCalledWith('category');
    });

    it('deve chamar watch para nome do produto', () => {
      render(<AdminFormComplete />);
      
      expect(mockWatch).toHaveBeenCalledWith('name');
    });

    it('deve chamar setValue quando necessário', () => {
      mockWatch.mockReturnValue('Teste Product');
      render(<AdminFormComplete />);
      
      // setValue deve ser chamado para auto-geração de slug
      expect(mockSetValue).toHaveBeenCalled();
    });

    it('deve chamar handleSubmit no form', () => {
      render(<AdminFormComplete />);
      
      expect(mockHandleSubmit).toHaveBeenCalled();
    });
  });

  describe('Edição de Produtos Existentes', () => {
    it('deve aceitar produto como prop', () => {
      const mockProduct = { id: '1', name: 'Test' };
      render(<AdminFormComplete product={mockProduct} />);
      
      expect(screen.getByTestId('admin-form-complete')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('deve aceitar callback onSuccess', () => {
      const mockOnSuccess = vi.fn();
      render(<AdminFormComplete onSuccess={mockOnSuccess} />);
      
      expect(screen.getByTestId('admin-form-complete')).toBeInTheDocument();
    });

    it('deve aceitar callback onCancel', () => {
      const mockOnCancel = vi.fn();
      render(<AdminFormComplete onCancel={mockOnCancel} />);
      
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  describe('Estrutura do Formulário', () => {
    it('deve ter estrutura de abas acessível', () => {
      render(<AdminFormComplete />);
      
      const tabsList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');
      
      expect(tabsList).toBeInTheDocument();
      expect(tabs).toHaveLength(5);
    });

    it('deve ter atributo data-testid no formulário', () => {
      render(<AdminFormComplete />);
      
      expect(screen.getByTestId('admin-form-complete')).toBeInTheDocument();
    });
  });
});

describe('completeProductSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve processar dados corretamente para criação', async () => {
    const mockData = {
      name: 'Produto Teste',
      slug: 'produto-teste',
      description: 'Descrição teste',
      category: 'Toxina Botulínica',
      price: 100,
      price_pix: 90,
      price_card: 110,
      active: true,
      featured: false,
      requires_prescription: false,
      images: 'image1.jpg, image2.jpg',
      tags: 'tag1, tag2',
      seo_keywords: 'keyword1, keyword2',
      stock_quantity: 10,
      min_stock_alert: 5,
      requires_prescription: false,
      discount_percentage: 0,
      currency: 'BRL'
    };

    const result = await completeProductSubmit(mockData);
    expect(result).toBe(true);
  });

  it('deve processar dados corretamente para atualização', async () => {
    const mockData = {
      name: 'Produto Atualizado',
      slug: 'produto-atualizado',
      description: 'Descrição atualizada',
      category: 'Preenchedor',
      price: 200,
      price_pix: 180,
      price_card: 220,
      active: true,
      featured: true,
      requires_prescription: true,
      images: 'image1.jpg',
      tags: 'new-tag',
      seo_keywords: 'new-keyword',
      stock_quantity: 5,
      min_stock_alert: 2,
      discount_percentage: 10,
      currency: 'BRL'
    };

    const mockProduct = { id: '1' };

    const result = await completeProductSubmit(mockData, mockProduct);
    expect(result).toBe(true);
  });

  it('deve converter strings separadas por vírgula em arrays', async () => {
    const mockData = {
      name: 'Teste',
      slug: 'teste',
      description: 'Produto de teste',
      category: 'geral',
      featured: false,
      images: 'img1.jpg, img2.jpg, img3.jpg',
      tags: 'tag1, tag2, tag3',
      seo_keywords: 'kw1, kw2, kw3',
      price: 100,
      price_pix: 90,
      price_card: 110,
      active: true,
      currency: 'BRL',
      discount_percentage: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      requires_prescription: false,
    };

    // Mock para capturar os dados enviados
    const mockInsert = vi.fn(() => ({ error: null }));
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert
    } as any);

    await completeProductSubmit(mockData);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        seo_keywords: ['kw1', 'kw2', 'kw3']
      })
    );
  });
});