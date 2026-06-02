import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, AlertCircle, Save, X } from 'lucide-react';
import { designSystem } from '@/styles/design-system';
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

  // Style helpers (all consuming design-system tokens)
  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: designSystem.typography.fontSizes.sm,
    fontWeight: designSystem.typography.fontWeights.semibold,
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing.xs,
  };

  const requiredMark: React.CSSProperties = {
    color: designSystem.colors.error,
    marginLeft: 2,
  };

  const hintStyle: React.CSSProperties = {
    fontSize: designSystem.typography.fontSizes.xs,
    color: designSystem.colors.text.secondary,
    marginTop: designSystem.spacing.xs,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: designSystem.typography.fontSizes.xs,
    color: designSystem.colors.error,
    marginTop: designSystem.spacing.xs,
    display: 'flex',
    alignItems: 'center',
    gap: designSystem.spacing.xs,
    fontWeight: designSystem.typography.fontWeights.semibold,
  };

  const fieldInput = (hasError: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
    width: '100%',
    background: designSystem.colors.surface,
    border: `1px solid ${hasError ? designSystem.colors.error : designSystem.colors.border}`,
    borderRadius: designSystem.borderRadius.md,
    padding: `${designSystem.spacing.sm} ${designSystem.spacing.md}`,
    fontSize: designSystem.typography.fontSizes.sm,
    fontFamily: designSystem.typography.fontFamily,
    color: designSystem.colors.text.primary,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
    ...extra,
  });

  const sectionTitle = (text: string) => (
    <div
      style={{
        fontSize: designSystem.typography.fontSizes.xs,
        fontWeight: designSystem.typography.fontWeights.bold,
        color: designSystem.colors.primary[600],
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: `1px solid ${designSystem.colors.border}`,
        paddingBottom: designSystem.spacing.xs,
        marginTop: designSystem.spacing.lg,
        marginBottom: designSystem.spacing.md,
      }}
    >
      {text}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="ds-client-form"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: designSystem.spacing.md,
        fontFamily: designSystem.typography.fontFamily,
        color: designSystem.colors.text.primary,
      }}
      noValidate
    >
      <style>{`
        .ds-client-form input:focus,
        .ds-client-form select:focus,
        .ds-client-form textarea:focus {
          border-color: ${designSystem.colors.primary[500]} !important;
          box-shadow: 0 0 0 3px ${designSystem.colors.primary[100]};
        }
        .ds-client-form input[aria-invalid="true"],
        .ds-client-form textarea[aria-invalid="true"] {
          border-color: ${designSystem.colors.error};
        }
        .ds-client-form .ds-comodo-chip:hover { border-color: ${designSystem.colors.primary[500]}; }
      `}</style>

      {sectionTitle('Dados Pessoais')}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: designSystem.spacing.md,
        }}
      >
        <div>
          <label htmlFor="nome" style={fieldLabel}>
            Nome Completo<span style={requiredMark}>*</span>
          </label>
          <input
            id="nome"
            type="text"
            placeholder="Ex: Maria da Silva"
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'nome-error' : undefined}
            style={fieldInput(!!errors.nome)}
            {...register('nome')}
          />
          {errors.nome ? (
            <p id="nome-error" style={errorStyle} role="alert">
              <AlertCircle size={12} /> {errors.nome.message}
            </p>
          ) : (
            <p style={hintStyle}>Mínimo 3 caracteres</p>
          )}
        </div>

        <div>
          <label htmlFor="cpf" style={fieldLabel}>
            CPF (opcional)
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            aria-invalid={!!errors.cpf}
            style={fieldInput(!!errors.cpf)}
            {...register('cpf')}
          />
          {errors.cpf && (
            <p style={errorStyle} role="alert">
              <AlertCircle size={12} /> {errors.cpf.message}
            </p>
          )}
        </div>
      </div>

      {sectionTitle('Contato')}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: designSystem.spacing.md,
        }}
      >
        <div>
          <label htmlFor="telefone" style={fieldLabel}>
            WhatsApp<span style={requiredMark}>*</span>
          </label>
          <input
            id="telefone"
            type="tel"
            placeholder="(47) 99789-6229"
            aria-invalid={!!errors.telefone}
            aria-describedby={errors.telefone ? 'telefone-error' : undefined}
            style={fieldInput(!!errors.telefone)}
            {...register('telefone')}
          />
          {errors.telefone ? (
            <p id="telefone-error" style={errorStyle} role="alert">
              <AlertCircle size={12} /> {errors.telefone.message}
            </p>
          ) : (
            <p style={hintStyle}>Com DDD — apenas números ou formatado</p>
          )}
        </div>

        <div>
          <label htmlFor="email" style={fieldLabel}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="email@exemplo.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            style={fieldInput(!!errors.email)}
            {...register('email')}
          />
          {errors.email ? (
            <p id="email-error" style={errorStyle} role="alert">
              <AlertCircle size={12} /> {errors.email.message}
            </p>
          ) : (
            <p style={hintStyle}>Formato: nome@dominio.com</p>
          )}
        </div>
      </div>

      {sectionTitle('Endereço')}
      <div>
        <label htmlFor="endereco" style={fieldLabel}>
          Endereço
        </label>
        <input
          id="endereco"
          type="text"
          placeholder="Rua, número"
          style={fieldInput(false)}
          {...register('endereco')}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: designSystem.spacing.md,
        }}
      >
        <div>
          <label htmlFor="bairro" style={fieldLabel}>
            Bairro
          </label>
          <input id="bairro" type="text" style={fieldInput(false)} {...register('bairro')} />
        </div>
        <div>
          <label htmlFor="cidade" style={fieldLabel}>
            Cidade
          </label>
          <input id="cidade" type="text" style={fieldInput(false)} {...register('cidade')} />
        </div>
        <div>
          <label htmlFor="uf" style={fieldLabel}>
            UF
          </label>
          <input
            id="uf"
            type="text"
            maxLength={2}
            placeholder="SC"
            aria-invalid={!!errors.uf}
            style={{ ...fieldInput(!!errors.uf), textTransform: 'uppercase' }}
            {...register('uf', {
              setValueAs: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
            })}
          />
          {errors.uf && (
            <p style={errorStyle} role="alert">
              <AlertCircle size={12} /> {errors.uf.message}
            </p>
          )}
        </div>
      </div>

      {sectionTitle('Perfil do Lead')}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: designSystem.spacing.md,
        }}
      >
        <div>
          <label htmlFor="tipoImovel" style={fieldLabel}>
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
                style={fieldInput(false, { cursor: 'pointer' })}
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
          <label htmlFor="origem" style={fieldLabel}>
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
                style={fieldInput(false, { cursor: 'pointer' })}
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
        <label style={fieldLabel}>Cômodos de Interesse</label>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: designSystem.spacing.xs,
            marginTop: designSystem.spacing.xs,
          }}
        >
          {comodos.map((c) => {
            const isSelected = watchComodos.includes(c);
            return (
              <button
                key={c}
                type="button"
                className="ds-comodo-chip"
                onClick={() => toggleComodo(c)}
                style={{
                  padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
                  borderRadius: designSystem.borderRadius.full,
                  fontSize: designSystem.typography.fontSizes.xs,
                  fontWeight: designSystem.typography.fontWeights.semibold,
                  cursor: 'pointer',
                  fontFamily: designSystem.typography.fontFamily,
                  background: isSelected
                    ? designSystem.colors.primary[500]
                    : designSystem.colors.surface,
                  color: isSelected
                    ? designSystem.colors.surface
                    : designSystem.colors.text.primary,
                  border: `1px solid ${isSelected ? designSystem.colors.primary[500] : designSystem.colors.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: designSystem.spacing.xs,
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Check size={12} />}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="observacoes" style={fieldLabel}>
          Observações
        </label>
        <textarea
          id="observacoes"
          placeholder="Notas sobre o cliente, referências, preferências..."
          style={{
            ...fieldInput(false),
            minHeight: 96,
            resize: 'vertical',
            fontFamily: designSystem.typography.fontFamily,
          }}
          {...register('observacoes')}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designSystem.spacing.xs,
          padding: designSystem.spacing.md,
          borderRadius: designSystem.borderRadius.md,
          border: `1px solid ${watchStatus === 'ativo' ? '#A8D5B6' : '#F0A8AE'}`,
          background: watchStatus === 'ativo' ? '#E6F4EA' : '#FBE9EB',
          marginTop: designSystem.spacing.sm,
        }}
      >
        <label
          htmlFor="status"
          style={{
            ...fieldLabel,
            color:
              watchStatus === 'ativo' ? designSystem.colors.success : designSystem.colors.error,
            marginBottom: 0,
          }}
        >
          Status
        </label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <select
              id="status"
              value={field.value}
              onChange={field.onChange}
              style={{
                ...fieldInput(false, { cursor: 'pointer' }),
                border: `1px solid ${watchStatus === 'ativo' ? '#A8D5B6' : '#F0A8AE'}`,
                background: designSystem.colors.surface,
                fontWeight: designSystem.typography.fontWeights.bold,
              }}
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: designSystem.spacing.md,
          marginTop: designSystem.spacing.lg,
          paddingTop: designSystem.spacing.md,
          borderTop: `1px solid ${designSystem.colors.border}`,
        }}
      >
        <Button
          type="button"
          onClick={onCancel}
          style={{
            background: designSystem.colors.surface,
            color: designSystem.colors.text.primary,
            border: `1px solid ${designSystem.colors.border}`,
            borderRadius: designSystem.borderRadius.md,
            padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
            fontSize: designSystem.typography.fontSizes.sm,
            fontWeight: designSystem.typography.fontWeights.semibold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: designSystem.spacing.sm,
            cursor: 'pointer',
            fontFamily: designSystem.typography.fontFamily,
          }}
        >
          <X size={16} />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          style={{
            background: designSystem.colors.primary[500],
            color: designSystem.colors.surface,
            border: 'none',
            borderRadius: designSystem.borderRadius.md,
            padding: `${designSystem.spacing.sm} ${designSystem.spacing.lg}`,
            fontSize: designSystem.typography.fontSizes.sm,
            fontWeight: designSystem.typography.fontWeights.semibold,
            display: 'inline-flex',
            alignItems: 'center',
            gap: designSystem.spacing.sm,
            boxShadow: `0 4px 12px ${designSystem.colors.primary[500]}40`,
            cursor: isSubmitting || !isDirty ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !isDirty ? 0.6 : 1,
            fontFamily: designSystem.typography.fontFamily,
          }}
        >
          <Save size={16} />
          {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </form>
  );
};

export default ClientForm;
