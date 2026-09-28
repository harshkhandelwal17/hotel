import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_statement = "import { Search, Filter, Download, ArrowUpDown, TrendingUp, IndianRupee, CreditCard, Building } from 'lucide-react';"
import_statement_new = "import { Search, Filter, Download, ArrowUpDown, TrendingUp, IndianRupee, CreditCard, Building } from 'lucide-react';\nimport { useOutletContext } from 'react-router-dom';"

if "useOutletContext" not in content:
    content = content.replace(import_statement, import_statement_new)

state_declaration = "const [hostelFilter, setHostelFilter] = useState('all');"
state_declaration_new = """const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');
  
  useEffect(() => {
    if (globalProperty) {
      setHostelFilter(globalProperty);
    }
  }, [globalProperty]);"""

if "const { globalProperty }" not in content:
    content = content.replace(state_declaration, state_declaration_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Synced Reports with global property")
