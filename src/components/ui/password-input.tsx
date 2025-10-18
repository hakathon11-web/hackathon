import React, { useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { validatePassword, getPasswordStrength } from '@/utils/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
  showStrengthIndicator?: boolean;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PasswordInput({
  label = "Password",
  placeholder = "Enter your password",
  value,
  onChange,
  showValidation = true,
  showStrengthIndicator = true,
  className,
  required = false,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const validation = validatePassword(value);
  const strength = getPasswordStrength(validation.score);
  
  const requirements = [
    { key: 'length', label: 'At least 8 characters', met: !validation.errors.length },
    { key: 'uppercase', label: 'One uppercase letter (A-Z)', met: !validation.errors.uppercase },
    { key: 'lowercase', label: 'One lowercase letter (a-z)', met: !validation.errors.lowercase },
    { key: 'numbers', label: 'One number (0-9)', met: !validation.errors.numbers },
    { key: 'symbols', label: 'One special character (!@#$%^&*)', met: !validation.errors.symbols },
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="password">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "pr-10",
            !validation.isValid && value.length > 0 && "border-red-500 focus:border-red-500"
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>

      {/* Strength Indicator */}
      {showStrengthIndicator && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  validation.score === 0 && "w-[0%] bg-red-500",
                  validation.score === 1 && "w-[20%] bg-red-500",
                  validation.score === 2 && "w-[40%] bg-orange-500",
                  validation.score === 3 && "w-[60%] bg-yellow-500",
                  validation.score === 4 && "w-[80%] bg-blue-500",
                  validation.score === 5 && "w-[100%] bg-green-500"
                )}
              />
            </div>
            <span className={cn("text-sm font-medium", strength.color)}>
              {strength.label}
            </span>
          </div>
          
          {showValidation && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Password requirements:</p>
              <div className="grid grid-cols-1 gap-1">
                {requirements.map((req) => (
                  <div
                    key={req.key}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      req.met ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {req.met ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span>{req.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Show specific feedback for weak patterns */}
              {validation.feedback.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {validation.feedback[0]}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}