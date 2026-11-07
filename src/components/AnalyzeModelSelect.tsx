import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnalyzeModels } from '@/lib/analyzeModels';

interface AnalyzeModelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const AnalyzeModelSelect: React.FC<AnalyzeModelSelectProps> = ({
  value,
  onValueChange,
  disabled = false,
  id,
  className,
}) => {
  const { data } = useAnalyzeModels();
  const autoKey = data?.autoKey || 'auto';
  const models = data?.models || [];
  const majorModels = models.filter((model) => model.kind === 'major');
  const openWeightModels = models.filter((model) => model.kind === 'open_weight');

  return (
    <Select value={value || autoKey} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="انتخاب مدل تحلیل" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={autoKey}>Auto (پیشنهادی)</SelectItem>
        {majorModels.length > 0 && (
          <SelectGroup>
            <SelectLabel>مدل‌های اصلی</SelectLabel>
            {majorModels.map((model) => (
              <SelectItem key={model.key} value={model.key}>
                {model.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {openWeightModels.length > 0 && (
          <SelectGroup>
            <SelectLabel>مدل‌های متن‌باز</SelectLabel>
            {openWeightModels.map((model) => (
              <SelectItem key={model.key} value={model.key}>
                {model.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};

export default AnalyzeModelSelect;
