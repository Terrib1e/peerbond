interface AIToolsPanelProps {
  groupId: string;
}

export default function AIToolsPanel({ groupId: _groupId }: AIToolsPanelProps) {
  // const { user } = useAuthStore(); // Commented out unused variable

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">AI Tools</h3>
      <p className="text-gray-600">AI tools panel will be implemented here.</p>
    </div>
  );
}