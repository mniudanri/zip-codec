import { Select } from '@mantine/core';
import { ENCODING_VARIANTS, encodingVariantSchema, type EncodingVariant } from '@shared/domain/archive';

const DESCRIPTIONS: Record<EncodingVariant, string> = {
  STANDARD: 'STANDARD - RFC 4648, one unbroken line (default)',
  MIME: 'MIME - RFC 2045, wrapped at 76 characters',
  URL_SAFE: 'URL_SAFE - RFC 4648 §5, uses - and _ instead of + and /',
};

export interface VariantSelectProps {
  value: EncodingVariant;
  onChange: (variant: EncodingVariant) => void;
  disabled?: boolean;
  label?: string;
}

export function VariantSelect({
  value,
  onChange,
  disabled = false,
  label = 'Base64 variant',
}: VariantSelectProps) {
    
  return (
    <Select
      label={label}
      description="Must match on both sides: decoding MIME output as STANDARD fails."
      data={ENCODING_VARIANTS.map((variant) => ({
        value: variant,
        label: DESCRIPTIONS[variant],
      }))}
      value={value}
      onChange={(next) => {
        const parsed = encodingVariantSchema.safeParse(next);
        if (parsed.success) {
          onChange(parsed.data);
        }
      }}
      allowDeselect={false}
      disabled={disabled}
      maw={420}
    />
  );
}