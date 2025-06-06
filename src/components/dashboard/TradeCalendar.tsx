"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow, TableCaption 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { calculateProfitLoss, formatCurrency, formatDate } from "@/lib/trade-utils";
import type { Trade } from "@/types";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, 
  getDay, isToday, parseISO, isValid, startOfDay, endOfDay
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";

interface TradeCalendarProps {
  trades: Trade[];
  isLoading?: boolean;
}

export function TradeCalendar({ trades, isLoading }: TradeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Generate days for the calendar
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    
    return eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  }, [currentMonth]);
  
  // Map trades to days
  const tradesByDay = useMemo(() => {
    if (isLoading || !trades || trades.length === 0) return new Map();
    
    const tradeMap = new Map<string, Trade[]>();
    
    trades.forEach(trade => {
      if (!trade.exitDate) return; // Skip open trades
      
      try {
        const exitDate = parseISO(trade.exitDate);
        if (!isValid(exitDate)) return;
        
        const dateKey = format(exitDate, 'yyyy-MM-dd');
        const existingTrades = tradeMap.get(dateKey) || [];
        tradeMap.set(dateKey, [...existingTrades, trade]);
      } catch (e) {
        console.error("Invalid date format:", trade.exitDate);
      }
    });
    
    return tradeMap;
  }, [trades, isLoading]);
  
  // Get trades for the selected day
  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tradesByDay.get(dateKey) || [];
  }, [selectedDate, tradesByDay]);
  
  // Get stats for a specific day
  const getDayStats = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayTrades = tradesByDay.get(dateKey) || [];
    
    if (dayTrades.length === 0) return null;
    
    let totalPnL = 0;
    let winCount = 0;
    let lossCount = 0;
    
    dayTrades.forEach((trade: Trade) => {
      const pnl = calculateProfitLoss(trade);
      if (pnl === null) return;
      
      totalPnL += pnl;
      
      if (pnl > 0) winCount++;
      else if (pnl < 0) lossCount++;
    });
    
    return {
      totalTrades: dayTrades.length,
      totalPnL,
      winCount,
      lossCount,
      winRate: dayTrades.length > 0 ? (winCount / dayTrades.length) * 100 : 0
    };
  };
  
  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(nextMonth => addMonths(nextMonth, 1));
  };
  
  // Handle day click
  const handleDayClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayTrades = tradesByDay.get(dateKey) || [];
    
    if (dayTrades.length > 0) {
      setSelectedDate(day);
      setIsDialogOpen(true);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Lịch Giao Dịch Hàng Tháng</CardTitle>
          <CardDescription>Xem giao dịch của bạn theo ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Calculate first day of month offset (0 = Sunday, 1 = Monday, etc.)
  const firstDayOffset = getDay(startOfMonth(currentMonth));
  
  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg sm:text-xl">Lịch Giao Dịch Hàng Tháng</CardTitle>
            <CardDescription>Xem giao dịch của bạn theo ngày</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm sm:text-base min-w-20 text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day labels - Use index in key to ensure uniqueness */}
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, i) => (
            <div key={`day-${i}`} className="text-center text-xs sm:text-sm font-medium py-1">
              {day}
            </div>
          ))}
          
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOffset }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square p-0.5 sm:p-1 bg-muted/30 rounded-md" />
          ))}
          
          {/* Calendar days */}
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTrades = tradesByDay.get(dateKey) || [];
            const hasTrades = dayTrades.length > 0;
            const stats = hasTrades ? getDayStats(day) : null;
            
            return (
              <div 
                key={dateKey}
                onClick={() => hasTrades && handleDayClick(day)}
                className={`
                  aspect-square p-0.5 sm:p-1 rounded-md border flex flex-col
                  ${hasTrades ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : 'bg-background'}
                  ${isToday(day) ? 'border-primary/50 bg-primary/10' : 'border-border/50'}
                `}
              >
                <div className="text-right text-xs font-medium mb-0.5">
                  {format(day, 'd')}
                </div>
                
                {hasTrades && stats && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-center">
                      <Badge variant="outline" className="text-[0.65rem] px-0.5 py-0 h-3 sm:text-xs sm:h-4">
                        {dayTrades.length}
                      </Badge>
                    </div>
                    
                    <div 
                      className={`text-[0.65rem] sm:text-xs text-center font-medium 
                        ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(stats.totalPnL, 'USD', true, false)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      
      {/* Dialog for day detail */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto p-3 sm:p-6">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
              Giao dịch ngày {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedDayTrades.length} giao dịch hoàn thành trong ngày này
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedDate && (
              <>
                {/* Daily stats summary */}
                {(() => {
                  const stats = getDayStats(selectedDate);
                  if (!stats) return null;
                  
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                        <div className="text-xs sm:text-sm font-medium text-muted-foreground">Tỷ lệ thắng</div>
                        <div className="text-sm sm:text-lg font-semibold">{stats.winRate.toFixed(0)}%</div>
                      </div>
                      <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                        <div className="text-xs sm:text-sm font-medium text-muted-foreground">Tổng Lãi/Lỗ</div>
                        <div className={`text-sm sm:text-lg font-semibold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(stats.totalPnL, 'USD', false, false)}
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                        <div className="text-xs sm:text-sm font-medium text-muted-foreground">Thắng</div>
                        <div className="text-sm sm:text-lg font-semibold text-green-600">{stats.winCount}</div>
                      </div>
                      <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                        <div className="text-xs sm:text-sm font-medium text-muted-foreground">Thua</div>
                        <div className="text-sm sm:text-lg font-semibold text-red-600">{stats.lossCount}</div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Mobile-optimized trade list */}
                <div className="mt-4 space-y-2 sm:hidden">
                  {selectedDayTrades.map((trade: Trade) => {
                    const pnl = calculateProfitLoss(trade);
                    return (
                      <div key={trade.id} className="border rounded-md p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="font-medium flex items-center gap-1.5">
                            <span>{trade.symbol}</span>
                            {trade.tradeType === 'buy' ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-[0.65rem] px-1 py-0">
                                Mua
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-[0.65rem] px-1 py-0">
                                Bán
                              </Badge>
                            )}
                          </div>
                          <div className={`font-medium text-sm ${pnl && pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl !== null ? formatCurrency(pnl, 'USD', false, false) : '—'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SL:</span> 
                            <span>{trade.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá vào:</span>
                            <span>{formatCurrency(trade.entryPrice, 'USD', false)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá ra:</span>
                            <span>{trade.exitPrice ? formatCurrency(trade.exitPrice, 'USD', false) : 'Đang mở'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Desktop trade table - hidden on mobile */}
                <div className="rounded-md border overflow-x-auto hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Mã CP</TableHead>
                        <TableHead className="w-[70px]">Hướng</TableHead>
                        <TableHead className="w-[70px]">SL</TableHead>
                        <TableHead className="w-[90px]">Giá vào</TableHead>
                        <TableHead className="w-[90px]">Giá ra</TableHead>
                        <TableHead className="text-right w-[80px]">Lãi/Lỗ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDayTrades.map((trade: Trade) => {
                        const pnl = calculateProfitLoss(trade);
                        
                        return (
                          <TableRow key={trade.id}>
                            <TableCell className="font-medium text-sm py-2">{trade.symbol}</TableCell>
                            <TableCell className="py-2">
                              {trade.tradeType === 'buy' ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs px-1 py-0">
                                  Mua
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs px-1 py-0">
                                  Bán
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm py-2">{trade.quantity}</TableCell>
                            <TableCell className="text-sm py-2">{formatCurrency(trade.entryPrice, 'USD', false)}</TableCell>
                            <TableCell className="text-sm py-2">{trade.exitPrice ? formatCurrency(trade.exitPrice, 'USD', false) : 'Đang mở'}</TableCell>
                            <TableCell 
                              className={`text-right font-medium text-sm py-2 ${pnl && pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {pnl !== null ? formatCurrency(pnl, 'USD', false, false) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}