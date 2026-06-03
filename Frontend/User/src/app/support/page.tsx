'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Plus, Send, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tickets } from '@/lib/dummy-data';
import { RelativeTime } from '@/components/ui/relative-time';

export default function SupportPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const statusIcons = {
    open: <AlertCircle className="h-4 w-4 text-accent-red" />,
    pending: <Clock className="h-4 w-4 text-accent-gold" />,
    resolved: <CheckCircle className="h-4 w-4 text-green-400" />,
    closed: <CheckCircle className="h-4 w-4 text-text-muted" />,
  };

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400',
    medium: 'bg-accent-gold/20 text-accent-gold',
    high: 'bg-accent-red/20 text-accent-red',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ subject, message, priority });
    setShowNewTicket(false);
    setSubject('');
    setMessage('');
    setPriority('medium');
  };

  return (
    <div className="relative min-h-[min(72vh,840px)]">
      <div className="space-y-6 blur-[3px] brightness-[0.92]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-secondary/20 to-accent-blue/20 p-6 border border-secondary/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20">
              <Headphones className="h-7 w-7 text-secondary-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Support Center</h2>
              <p className="text-text-secondary mt-1">We are here to help you 24/7</p>
            </div>
          </div>
          <Button onClick={() => setShowNewTicket(!showNewTicket)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </motion.div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-0">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg">Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Message</label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowNewTicket(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Send className="h-4 w-4" />
                    Submit Ticket
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tickets List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">My Tickets</CardTitle>
              <Badge variant="outline">{tickets.length} tickets</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-card-border">
              {tickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  className="p-6 hover:bg-card-hover/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${priorityColors[ticket.priority]}`}>
                        {statusIcons[ticket.status]}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{ticket.subject}</p>
                        <p className="text-sm text-text-muted mt-1">
                          <RelativeTime value={ticket.createdAt} /> • Ticket #{ticket.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        ticket.status === 'open' ? 'danger' :
                        ticket.status === 'pending' ? 'warning' :
                        ticket.status === 'resolved' ? 'success' : 'outline'
                      } size="sm">
                        {ticket.status}
                      </Badge>
                      {expandedTicket === ticket.id ? (
                        <ChevronUp className="h-4 w-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedTicket === ticket.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-card-border"
                    >
                      <p className="text-sm text-text-secondary mb-4">{ticket.message}</p>

                      {/* Conversation */}
                      <div className="space-y-4">
                        {ticket.responses.map((response, i) => (
                          <div
                            key={i}
                            className={`flex ${response.from === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] p-3 rounded-xl ${
                              response.from === 'user'
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-card-hover border border-card-border'
                            }`}>
                              <p className="text-sm text-text-primary">{response.message}</p>
                              <p className="text-xs text-text-muted mt-1">
                                {response.from === 'user' ? 'You' : 'Support'} • <RelativeTime value={response.timestamp} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {ticket.status !== 'closed' && (
                        <div className="mt-4 flex gap-2">
                          <Input placeholder="Type your reply..." className="flex-1" />
                          <Button size="sm" className="gap-2">
                            <Send className="h-4 w-4" />
                            Send
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { q: 'How do I withdraw funds?', a: 'Go to Wallet > Withdraw and follow the instructions.' },
                { q: 'What are the withdrawal limits?', a: 'Minimum withdrawal is $100. Processing takes 2-3 business days.' },
                { q: 'How to upgrade my package?', a: 'Visit the Package page to see upgrade options.' },
                { q: 'When will I receive binary commissions?', a: 'Binary commissions are calculated daily at midnight.' },
              ].map((faq, i) => (
                <div key={i} className="p-4 rounded-xl bg-card-hover border border-card-border">
                  <p className="font-medium text-text-primary mb-2">{faq.q}</p>
                  <p className="text-sm text-text-secondary">{faq.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </div>

      <div
        className="absolute inset-0 z-10 flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-coming-soon-title"
        aria-describedby="support-coming-soon-desc"
      >
        <div
          className="absolute inset-0 bg-background/55 backdrop-blur-md dark:bg-background/70"
          aria-hidden
        />
        <div className="relative z-20 max-w-md rounded-2xl border border-primary/25 bg-card/90 px-8 py-10 text-center shadow-2xl shadow-black/20 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Support</p>
          <h1 id="support-coming-soon-title" className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            Coming soon
          </h1>
          <p id="support-coming-soon-desc" className="mt-3 text-sm leading-relaxed text-text-secondary">
            Ticketing and in-app support are not live yet. Check back later or use your sponsor for urgent
            questions.
          </p>
        </div>
      </div>
    </div>
  );
}
