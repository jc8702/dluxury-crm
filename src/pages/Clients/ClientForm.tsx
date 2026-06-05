import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, Check } from 'lucide-react';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { clientSchema, type ClientFormData } from '../../validators';
import type { Client } from '../../types/entities';

const comodos = [
  'Cozinha',
  'Quarto',
  'Sala',
  'Banheiro',
  'Lavanderia',
  'Closet',
  'Home Office',
  'Área Gourmet',
  'Varanda',
];

const tipoImovelOptions = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'comercial', label: 'Comercial' },
];

const origemOptions = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'feira', label: 'Feira/Evento' },
  { value: 'passante', label: 'Passante' },
  { value: 'outro', label: 'Outro' },
];

const statusOptions = [
  { value: 'ativo', label: 'ATIVO' },
  { value: 'inativo', label: 'INATIVO' },
];

interface ClientFormProps {
  initialData?: Client | null;
  onSubmit: (data: ClientFormData) => Promise<void> | void;
  onCancel: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cpf: initialData?.cpf || '',
      telefone: initialData?.telefone || '',
      email: initialData?.email || '',
      endereco: initialData?.endereco || '',
      bairro: initialData?.bairro || '',
      cidade: initialData?.cidade || '',
      uf: initialData?.uf || '',
      tipoImovel:
        (initialData?.tipoImovel as 'casa' | 'apartamento' | 'comercial' | undefined) || 'casa',
      comodosInteresse: initialData?.comodosInteresse || [],
      origem:
        (initialData?.origem as
          | 'indicacao'
          | 'instagram'
          | 'google'
          | 'feira'
          | 'passante'
          | 'outro'
          | undefined) || 'indicacao',
      observacoes: initialData?.observacoes || '',
      status: (initialData?.status as 'ativo' | 'inativo' | undefined) || 'ativo',
    },
  });

  const watchComodos = watch('comodosInteresse') || [];
  const watchStatus = watch('status');

  const toggleComodo = (comodo: string) => {
    const next = watchComodos.includes(comodo)
      ? watchComodos.filter((c) => c !== comodo)
      : [...watchComodos, comodo];
    setValue('comodosInteresse', next, { shouldValidate: true, shouldDirty: true });
  };

  const handleFormSubmit = async (data: ClientFormData) => {
    try {
      await onSubmit(data);
    } catch {
      // erro tratado pelo pai
    }
  };

  const sectionTitle = (text: string) => (
    <div className="text-[12px] font-bold text-[var(--ui-color-primary)] uppercase tracking-wider border-b border-[var(--ui-border)] pb-2 mt-6 mb-4">
      {text}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-5 text-[var(--ui-text-primary)]"
      noValidate
    >
      {sectionTitle('Dados Pessoais')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome Completo"
          placeholder="Ex: Maria da Silva"
          required
          error={errors.nome?.message}
          hint="Mínimo 3 caracteres"
          {...register('nome')}
        />
        <Input
          label="CPF (opcional)"
          placeholder="000.000.000-00"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
      </div>

      {sectionTitle('Contato')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="WhatsApp"
          type="tel"
          placeholder="(47) 99789-6229"
          required
          error={errors.telefone?.message}
          hint="Com DDD — apenas números ou formatado"
          {...register('telefone')}
        />
        <Input
          label="E-mail"
          type="email"
          placeholder="email@exemplo.com"
          error={errors.email?.message}
          hint="Formato: nome@dominio.com"
          {...register('email')}
        />
      </div>

      {sectionTitle('Endereço')}
      <Input label="Endereço" placeholder="Rua, número" {...register('endereco')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <Input label="Bairro" {...register('bairro')} />
        <Input label="Cidade" {...register('cidade')} />
        <Input
          label="UF"
          maxLength={2}
          placeholder="SC"
          error={errors.uf?.message}
          className="uppercase"
          {...register('uf', {
            setValueAs: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
          })}
        />
      </div>

      {sectionTitle('Perfil do Lead')}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="tipoImovel"
          control={control}
          render={({ field }) => (
            <Select
              label="Tipo de Imóvel"
              options={tipoImovelOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="origem"
          control={control}
          render={({ field }) => (
            <Select
              label="Como chegou"
              options={origemOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="mt-2">
        <label className="text-[var(--ui-text-sm)] font-medium text-[var(--ui-text-primary)] mb-2 block">
          Cômodos de Interesse
        </label>
        <div className="flex flex-wrap gap-2">
          {comodos.map((c) => {
            const isSelected = watchComodos.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleComodo(c)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-[var(--ui-color-primary)] text-white border-[var(--ui-color-primary)] shadow-[var(--ui-shadow-primary)]'
                    : 'bg-[var(--ui-surface)] text-[var(--ui-text-secondary)] border-[var(--ui-border)] hover:border-[var(--ui-color-primary)]/50'
                }`}
              >
                {isSelected && <Check size={12} />}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2">
        <Textarea
          label="Observações"
          placeholder="Notas sobre o cliente, referências, preferências..."
          {...register('observacoes')}
        />
      </div>

      <div
        className={`flex flex-col gap-2 p-5 rounded-[var(--ui-radius-lg)] border transition-colors mt-4 ${
          watchStatus === 'ativo'
            ? 'border-[var(--ui-color-success)]/30 bg-[var(--ui-color-success)]/5'
            : 'border-[var(--ui-color-danger)]/30 bg-[var(--ui-color-danger)]/5'
        }`}
      >
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label={
                <span
                  className={`font-bold uppercase tracking-wider ${
                    watchStatus === 'ativo'
                      ? 'text-[var(--ui-color-success)]'
                      : 'text-[var(--ui-color-danger)]'
                  }`}
                >
                  Status do Cliente
                </span>
              }
              options={statusOptions}
              value={field.value}
              onChange={field.onChange}
              className={`font-bold ${
                watchStatus === 'ativo'
                  ? 'text-[var(--ui-color-success)]'
                  : 'text-[var(--ui-color-danger)]'
              }`}
            />
          )}
        />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[var(--ui-border)]">
        <Button type="button" onClick={onCancel} variant="outline" className="gap-2">
          <X size={16} />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="gap-2 shadow-[var(--ui-shadow-primary)]"
        >
          <Save size={16} />
          {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </form>
  );
};

export default ClientForm;
