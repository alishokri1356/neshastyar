import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles, Users, Search } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-xl text-foreground">Modyar</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Microphone Icon */}
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
            <Mic className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Transform Your Meetings
            <br />
            <span className="text-primary">with AI Power</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Record, summarize, and extract action items from your meetings automatically. Create 
            a searchable knowledge base of all your conversations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
            >
              Start Free Trial →
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/login')}
              className="px-8 py-4 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* AI-Powered Summaries */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">AI-Powered Summaries</h3>
              <p className="text-muted-foreground">
                Automatically generate comprehensive meeting summaries with key points, decisions, and insights using advanced AI technology.
              </p>
            </CardContent>
          </Card>

          {/* Action Item Extraction */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Action Item Extraction</h3>
              <p className="text-muted-foreground">
                Never miss follow-up again. AI identifies and extracts action items, deadlines, and assignments from your conversations.
              </p>
            </CardContent>
          </Card>

          {/* Searchable Archive */}
          <Card className="text-center p-6 border border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Searchable Archive</h3>
              <p className="text-muted-foreground">
                Build a searchable knowledge base of all your meetings. Find any discussion, decision, or detail instantly.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Ready to revolutionize your meetings?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who use Modyar to make their meetings more 
            productive and actionable.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/signup')}
            className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
          >
            Get Started for Free →
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14 day free trial
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            🔒 Enterprise-grade security and GDPR compliance
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;