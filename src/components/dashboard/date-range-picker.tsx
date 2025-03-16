'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'


import type { DateRange } from 'react-day-picker'

export function CalendarDateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 1),
    to: new Date(),
  })

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover className="relative">
        {({ open }) => (
          <>
            <PopoverButton as={React.Fragment}>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground',
                )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} -{' '}
                      {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverButton>
            <AnimatePresence>
              {open && (
                <PopoverPanel
                  as={motion.div}
                  static
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="ring-opacity-5 absolute right-0 z-10 mt-2 w-auto rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverPanel>
              )}
            </AnimatePresence>
          </>
        )}
      </Popover>
    </div>
  )
}
