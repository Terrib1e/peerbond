import { Link } from 'react-router-dom';
import { ArrowRight, Users, Brain, Shield, TrendingUp } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PeerBond
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Micro-support groups powered by AI facilitators
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary px-6 py-3 text-lg"
            >
              Get Started
              <ArrowRight className="ml-2" size={20} />
            </Link>
            <Link
              to="/login"
              className="btn-outline px-6 py-3 text-lg"
            >
              Sign In
            </Link>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Supporting Recovery & Mental Wellness
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-6 text-center">
              <Users className="mx-auto mb-4 text-primary-600" size={48} />
              <h3 className="text-xl font-semibold mb-2">Smart Matching</h3>
              <p className="text-gray-600">
                Connect with 4-6 peers who share similar recovery or wellness goals
              </p>
            </div>
            <div className="card p-6 text-center">
              <Brain className="mx-auto mb-4 text-primary-600" size={48} />
              <h3 className="text-xl font-semibold mb-2">AI Facilitator</h3>
              <p className="text-gray-600">
                Get guided discussions, track progress, and receive personalized insights
              </p>
            </div>
            <div className="card p-6 text-center">
              <Shield className="mx-auto mb-4 text-primary-600" size={48} />
              <h3 className="text-xl font-semibold mb-2">HIPAA Compliant</h3>
              <p className="text-gray-600">
                Secure, confidential platform designed for healthcare professionals
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Why PeerBond Works
          </h2>
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">The Problem</h3>
                <p className="text-gray-600 mb-4">
                  Recovering addicts and people managing anxiety/depression often drop out of peer programs because groups feel unstructured or mismatched.
                </p>
                <div className="flex items-center text-error-600">
                  <TrendingUp className="mr-2" size={20} />
                  <span>High dropout rates in traditional programs</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Our Solution</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Structured small groups (4-6 people)</li>
                  <li>• AI-powered matching and facilitation</li>
                  <li>• Progress tracking and insights</li>
                  <li>• Professional oversight dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands finding support and building lasting connections
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary px-8 py-4 text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              to="/therapist"
              className="btn-secondary px-8 py-4 text-lg"
            >
              For Therapists
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LandingPage;