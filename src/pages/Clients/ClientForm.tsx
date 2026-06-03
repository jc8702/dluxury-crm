import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, AlertCircle, Save, X } from 'lucide-react';
import { Button } from '../../components/common';
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

  // Classes utilitárias do Tailwind para formulário premium
  const getInputClass = (hasError: boolean, extra: string = '') => {
    return `w-full bg-card border ${hasError ? 'border-destructive focus:ring-destructive/15' : 'border-border focus:border-primary focus:ring-primary/15'} rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-4 box-border ${extra}`;
  };

  const sectionTitle = (text: string) => (
    <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border pb-1 mt-6 mb-4">
      {text}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-4 text-foreground"
      noValidate
    >
      {sectionTitle('Dados Pessoais')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-semibold text-foreground mb-1">
            Nome Completo<span className="text-destructive ml-0.5">*</span>
          </label>
          <input
            id="nome"
            type="text"
            placeholder="Ex: Maria da Silva"
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'nome-error' : undefined}
            className={getInputClass(!!errors.nome)}
            {...register('nome')}
          />
          {errors.nome ? (
            <p
              id="nome-error"
              className="text-xs text-destructive mt-1 flex items-center gap-1 font-semibold"
              role="alert"
            >
              <AlertCircle size={12} /> {errors.nome.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Mínimo 3 caracteres</p>
          )}
        </div>

        <div>
          <label htmlFor="cpf" className="block text-sm font-semibold text-foreground mb-1">
            CPF (opcional)
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            aria-invalid={!!errors.cpf}
            className={getInputClass(!!errors.cpf)}
            {...register('cpf')}
          />
          {errors.cpf && (
            <p
              className="text-xs text-destructive mt-1 flex items-center gap-1 font-semibold"
              role="alert"
            >
              <AlertCircle size={12} /> {errors.cpf.message}
            </p>
          )}
        </div>
      </div>

      {sectionTitle('Contato')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="telefone" className="block text-sm font-semibold text-foreground mb-1">
            WhatsApp<span className="text-destructive ml-0.5">*</span>
          </label>
          <input
            id="telefone"
            type="tel"
            placeholder="(47) 99789-6229"
            aria-invalid={!!errors.telefone}
            aria-describedby={errors.telefone ? 'telefone-error' : undefined}
            className={getInputClass(!!errors.telefone)}
            {...register('telefone')}
          />
          {errors.telefone ? (
            <p
              id="telefone-error"
              className="text-xs text-destructive mt-1 flex items-center gap-1 font-semibold"
              role="alert"
            >
              <AlertCircle size={12} /> {errors.telefone.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Com DDD — apenas números ou formatado
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={getInputClass(!!errors.email)}
            {...register('email')}
          />
          {errors.email ? (
            <p
              id="email-error"
              className="text-xs text-destructive mt-1 flex items-center gap-1 font-semibold"
              role="alert"
            >
              <AlertCircle size={12} /> {errors.email.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Formato: nome@dominio.com</p>
          )}
        </div>
      </div>

      {sectionTitle('Endereço')}
      <div>
        <label htmlFor="endereco" className="block text-sm font-semibold text-foreground mb-1">
          Endereço
        </label>
        <input
          id="endereco"
          type="text"
          placeholder="Rua, número"
          className={getInputClass(false)}
          {...register('endereco')}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="bairro" className="block text-sm font-semibold text-foreground mb-1">
            Bairro
          </label>
          <input id="bairro" type="text" className={getInputClass(false)} {...register('bairro')} />
        </div>
        <div>
          <label htmlFor="cidade" className="block text-sm font-semibold text-foreground mb-1">
            Cidade
          </label>
          <input id="cidade" type="text" className={getInputClass(false)} {...register('cidade')} />
        </div>
        <div>
          <label htmlFor="uf" className="block text-sm font-semibold text-foreground mb-1">
            UF
          </label>
          <input
            id="uf"
            type="text"
            maxLength={2}
            placeholder="SC"
            aria-invalid={!!errors.uf}
            className={getInputClass(!!errors.uf, 'uppercase')}
            {...register('uf', {
              setValueAs: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
            })}
          />
          {errors.uf && (
            <p
              className="text-xs text-destructive mt-1 flex items-center gap-1 font-semibold"
              role="alert"
            >
              <AlertCircle size={12} /> {errors.uf.message}
            </p>
          )}
        </div>
      </div>

      {sectionTitle('Perfil do Lead')}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tipoImovel" className="block text-sm font-semibold text-foreground mb-1">
            Tipo de Imóvel
          </label>
          <Controller
            name="tipoImovel"
            control={control}
            render={({ field }) => (
              <select
                id="tipoImovel"
                value={field.value}
                onChange={field.onChange}
                className={getInputClass(false, 'cursor-pointer')}
              >
                {tipoImovelOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
        <div>
          <label htmlFor="origem" className="block text-sm font-semibold text-foreground mb-1">
            Como chegou
          </label>
          <Controller
            name="origem"
            control={control}
            render={({ field }) => (
              <select
                id="origem"
                value={field.value}
                onChange={field.onChange}
                className={getInputClass(false, 'cursor-pointer')}
              >
                {origemOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-1">
          Cômodos de Interesse
        </label>
        <div className="flex flex-wrap gap-2 mt-1">
          {comodos.map((c) => {
            const isSelected = watchComodos.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleComodo(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 inline-flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary'
                }`}
              >
                {isSelected && <Check size={12} />}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="observacoes" className="block text-sm font-semibold text-foreground mb-1">
          Observações
        </label>
        <textarea
          id="observacoes"
          placeholder="Notas sobre o cliente, referências, preferências..."
          className={getInputClass(false, 'min-h-[96px] resize-vertical')}
          {...register('observacoes')}
        />
      </div>

      <div
        className={`flex flex-col gap-1.5 p-4 rounded-xl border ${
          watchStatus === 'ativo'
            ? 'border-success/30 bg-success/5'
            : 'border-destructive/30 bg-destructive/5'
        } mt-2`}
      >
        <label
          htmlFor="status"
          className={`block text-xs font-bold uppercase tracking-wider ${
            watchStatus === 'ativo' ? 'text-success' : 'text-destructive'
          }`}
        >
          Status do Cliente
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <select
              id="status"
              value={field.value}
              onChange={field.onChange}
              className={`w-full bg-card border rounded-xl px-4 py-2.5 text-sm text-foreground font-bold outline-none focus:ring-4 ${
                watchStatus === 'ativo'
                  ? 'border-success/30 focus:border-success focus:ring-success/15'
                  : 'border-destructive/30 focus:border-destructive focus:ring-destructive/15'
              }`}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="px-6 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2 hover:bg-muted"
        >
          <X size={16} />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="btn-primary px-6 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2 shadow-md"
        >
          <Save size={16} />
          {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </form>
  );
};

export default ClientForm;
