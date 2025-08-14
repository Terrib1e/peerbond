/**
 * Command Palette Component
 * Shows available slash commands when user types "/"
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { 
  searchCommands, 
  COMMAND_CATEGORIES,
  SlashCommand,
  formatCommandSyntax 
} from '@/utils/slashCommands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: SlashCommand, args?: string) => void;
  searchQuery?: string;
  position?: 'above' | 'below';
  className?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectCommand,
  searchQuery = '',
  position = 'above',
  className
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const commands = searchCommands(searchQuery);
      setFilteredCommands(commands);
      setSelectedIndex(0);
      setCommandInput('');
    }
  }, [isOpen, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelectCommand(filteredCommands[selectedIndex]);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const handleSelectCommand = (command: SlashCommand) => {
    if (command.requiresInput && !commandInput) {
      // Focus on input field for commands that require input
      const inputEl = paletteRef.current?.querySelector('input');
      inputEl?.focus();
      return;
    }

    onSelectCommand(command, commandInput);
    onClose();
  };

  const groupedCommands = COMMAND_CATEGORIES.map(category => ({
    ...category,
    commands: filteredCommands.filter(cmd => cmd.category === category.id)
  })).filter(group => group.commands.length > 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={paletteRef}
        initial={{ opacity: 0, y: position === 'above' ? 10 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'above' ? 10 : -10 }}
        className={cn(
          'absolute left-0 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50',
          position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
          'max-h-96 overflow-y-auto',
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <Command className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Quick Commands</h3>
              <p className="text-xs text-gray-500">
                Use arrow keys to navigate, Enter to select, Esc to close
              </p>
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No commands found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try typing a different command or keyword
              </p>
            </div>
          ) : (
            groupedCommands.map((group, groupIndex) => (
              <div key={group.id} className={cn(groupIndex > 0 && 'mt-4')}>
                <div className="px-4 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <group.icon className="w-3 h-3" />
                    {group.label}
                  </div>
                </div>
                
                {group.commands.map((command, cmdIndex) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = selectedIndex === globalIndex;
                  const Icon = command.icon;

                  return (
                    <motion.div
                      key={command.command}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: cmdIndex * 0.02 }}
                    >
                      <button
                        onClick={() => handleSelectCommand(command)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          'w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors',
                          isSelected && 'bg-blue-50'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        )}>
                          <Icon className={cn(
                            'w-4 h-4',
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          )} />
                        </div>
                        
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-mono text-sm',
                              isSelected ? 'text-blue-600' : 'text-gray-900'
                            )}>
                              {formatCommandSyntax(command)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {command.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {command.description}
                          </p>
                        </div>

                        {isSelected && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {/* Input field for commands that require input */}
                      {isSelected && command.requiresInput && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-3"
                        >
                          <input
                            type="text"
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && commandInput) {
                                handleSelectCommand(command);
                              }
                            }}
                            placeholder={command.inputPlaceholder}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Tips */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-500 text-center">
            Type <span className="font-mono bg-gray-200 px-1 rounded">/help</span> to see all commands
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}