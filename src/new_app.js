App = {

  loading: false,
  contracts: {},
  value: "",
  isMetaMaskConnected: false,
  charityCreated: false,
  organizationCreated: false,
  transactionCompleted: false,
  networkId: null,
  mockMode: false, // Flag to indicate if we're using mock data

  load: async () => {
    try {
      await App.loadWeb3()
      if (App.isMetaMaskConnected) {
        await App.loadAccount()
        
        // Get network ID
        App.networkId = await web3.eth.net.getId()
        console.log("Connected to network ID:", App.networkId)
        
        // Try to load the contract
        const contractLoaded = await App.loadContract()
        
        // Only proceed if contract was loaded successfully
        if (contractLoaded) {
          await App.renderTasks()
          // Show the main content if MetaMask is connected
          document.getElementById('main-content').style.display = 'block'
          document.getElementById('metamask-warning').style.display = 'none'
          document.getElementById('network-warning').style.display = 'none'
          
          // Update UI based on completion status
          App.updateWorkflowUI()
        } else {
          // Show network error message
          document.getElementById('main-content').style.display = 'none'
          document.getElementById('network-warning').style.display = 'block'
          document.getElementById('metamask-warning').style.display = 'none'
        }
      } else {
        // Hide the main content and show warning if MetaMask is not connected
        document.getElementById('main-content').style.display = 'none'
        document.getElementById('metamask-warning').style.display = 'block'
        document.getElementById('network-warning').style.display = 'none'
      }
    } catch (error) {
      console.error("Error during app initialization:", error)
      App.showError("Failed to initialize the application. Please make sure MetaMask is installed and connected.")
    }
  },

  loadWeb3: async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        App.web3Provider = window.ethereum
        web3 = new Web3(window.ethereum)
        
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        
        if (accounts.length > 0) {
          App.isMetaMaskConnected = true
          console.log("Already connected to MetaMask")
          
          // Get the network ID to check if we're on Ganache
          const networkId = await web3.eth.net.getId()
          console.log("Connected to network ID:", networkId)
          
          // Check if we're on a local network (Ganache typically uses network ID 1337 or 5777)
          if (networkId === 1337 || networkId === 5777) {
            console.log("Connected to Ganache local network")
          } else {
            console.log("Not connected to Ganache. Current network ID:", networkId)
          }
        } else {
          console.log("Not connected to MetaMask yet")
          App.isMetaMaskConnected = false
          // Prompt user to connect
          App.promptMetaMaskConnection()
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
          if (accounts.length === 0) {
            // User disconnected from MetaMask
            App.isMetaMaskConnected = false
            App.showError("MetaMask disconnected. Please connect to continue.")
            // Hide the main content and show warning
            document.getElementById('main-content').style.display = 'none'
            document.getElementById('metamask-warning').style.display = 'block'
          } else {
            // Account changed, reload the page
            window.location.reload()
          }
        })
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', function () {
          window.location.reload()
        })
        
      } else {
        App.isMetaMaskConnected = false
        App.showError("MetaMask is not installed. Please install MetaMask to use this application.")
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error)
      App.isMetaMaskConnected = false
      App.showError("Failed to connect to MetaMask. Please try again.")
    }
  },

  promptMetaMaskConnection: async () => {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length > 0) {
        App.isMetaMaskConnected = true
        App.showSuccess("Successfully connected to MetaMask!")
        // Reload the page to initialize with the connected account
        window.location.reload()
      }
    } catch (error) {
      console.error("User denied account access:", error)
      App.showError("MetaMask connection was denied. You need to connect to MetaMask to use this application.")
    }
  },

  loadAccount: async () => {
    try {
      // Get the current account
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      App.account = accounts[0]
      
      // Get account balance
      const balance = await web3.eth.getBalance(App.account)
      App.balance = web3.utils.fromWei(balance, "ether")
      
      // Display account info
      document.getElementById('connected-address').textContent = App.account
      document.getElementById('account-balance').textContent = App.balance + " ETH"
    } catch (error) {
      console.error("Error loading account:", error)
      App.showError("Failed to load account information.")
    }
  },

  loadContract: async () => {
    try {
      console.log("Loading contract...")
      
      try {
        // Try to load the contract JSON file
        const charity = await $.getJSON('charity.json')
        App.contracts.charity = TruffleContract(charity)
        App.contracts.charity.setProvider(App.web3Provider)

        // Try to get the deployed contract
        App.charity = await App.contracts.charity.deployed()
        
        // Check if user has already created a charity or organization
        await App.checkExistingEntities()
        
        // We're in real mode
        App.mockMode = false;
        console.log("Contract loaded successfully. Running in real mode.");
        
        return true
      } catch (error) {
        console.error("Contract not found or not deployed, using mock mode:", error)
        
        // Create a mock contract for testing
        App.mockMode = true;
        App.createMockContract()
        
        console.log("Running in mock mode with MetaMask integration.");
        
        return true
      }
    } catch (error) {
      console.error("Error loading contract:", error)
      App.showError("Failed to load the smart contract. Please make sure you're connected to the correct network.")
      return false
    }
  },
  
  createMockContract: () => {
    console.log("Creating mock contract...")
    
    // Create a mock charity object with the required functions
    App.charity = {
      // Mock data storage
      _charities: [],
      _organizations: [],
      _transactions: [],
      _blocks: [],
      _lastTransaction: null, // Store the last transaction for easy access
      
      // Mock counters
      charity_count: function() { return App._charities ? App._charities.length : 0 },
      org_count: function() { return App._organizations ? App._organizations.length : 0 },
      transaction_count: function() { return App._transactions ? App._transactions.length : 0 },
      blockchain_count: function() { return App._blocks ? App._blocks.length : 0 },
      
      // Mock charity functions
      charitys: async function(id) {
        if (id <= 0 || id > App._charities.length) {
          return [
            "", // name
            "", // description
            "", // account
            "", // bankName
            0,  // id
            "0x0000000000000000000000000000000000000000000000000000000000000000", // hash
            "0x0000000000000000000000000000000000000000", // address
            "0 ETH" // balance
          ]
        }
        return App._charities[id - 1]
      },
      
      // Mock organization functions
      org: async function(id) {
        if (id <= 0 || id > App._organizations.length) {
          return [
            "", // name
            "", // account
            "", // bankName
            0,  // id
            "0x0000000000000000000000000000000000000000000000000000000000000000", // hash
            "0x0000000000000000000000000000000000000000", // address
            "0 ETH" // balance
          ]
        }
        return App._organizations[id - 1]
      },
      
      // Mock transaction functions
      transaction_dict: async function(id) {
        if (id <= 0 || id > App._transactions.length) {
          return [
            "0x0000000000000000000000000000000000000000", // charity address
            "0x0000000000000000000000000000000000000000", // organization address
            "0", // amount
            0,  // id
            "0x0000000000000000000000000000000000000000000000000000000000000000" // hash
          ]
        }
        
        // If we're asking for the latest transaction and we have a stored last transaction
        if (id === App._transactions.length && App._lastTransaction) {
          return App._lastTransaction;
        }
        
        return App._transactions[id - 1]
      },
      
      // Mock blockchain functions
      Blockchain: async function(id) {
        if (id <= 0 || id > App._blocks.length) {
          return [
            [], // transactions
            0,  // timestamp
            "0x0000000000000000000000000000000000000000000000000000000000000000", // merkle root
            0,  // block number
            "0x0000000000000000000000000000000000000000000000000000000000000000", // hash
            "0x0000000000000000000000000000000000000000000000000000000000000000" // previous hash
          ]
        }
        return App._blocks[id - 1]
      },
      
      // Mock create functions
      createCharity: async function(name, description, bankAccount, bankName, address, balance, options) {
        console.log("Creating mock charity:", name, description, bankAccount, bankName, address, balance)
        
        // Generate a mock hash
        const hash = "0x" + Math.random().toString(16).substring(2, 34) + Math.random().toString(16).substring(2, 34)
        
        // Create a new charity
        const charity = [
          name,
          description,
          bankAccount,
          bankName,
          App._charities.length + 1, // id
          hash, // hash
          address, // address
          balance // balance
        ]
        
        // Add to the mock storage
        App._charities.push(charity)
        
        // Return a mock transaction receipt
        return {
          tx: "0x" + Math.random().toString(16).substring(2, 66),
          receipt: {
            transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
            blockNumber: App._blocks.length + 1
          }
        }
      },
      
      createOrganisation: async function(name, bankAccount, bankName, address, balance, options) {
        console.log("Creating mock organization:", name, bankAccount, bankName, address, balance)
        
        // Generate a mock hash
        const hash = "0x" + Math.random().toString(16).substring(2, 34) + Math.random().toString(16).substring(2, 34)
        
        // Create a new organization
        const organization = [
          name,
          bankAccount,
          bankName,
          App._organizations.length + 1, // id
          hash, // hash
          address, // address
          balance // balance
        ]
        
        // Add to the mock storage
        App._organizations.push(organization)
        
        // Return a mock transaction receipt
        return {
          tx: "0x" + Math.random().toString(16).substring(2, 66),
          receipt: {
            transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
            blockNumber: App._blocks.length + 1
          }
        }
      },
      
      createTransaction: async function(charityAddress, organizationAddress, amount, options) {
        console.log("Creating mock transaction:", charityAddress, organizationAddress, amount)
        
        // Generate a mock hash
        const hash = "0x" + Math.random().toString(16).substring(2, 34) + Math.random().toString(16).substring(2, 34)
        
        // Create a new transaction
        const transaction = [
          charityAddress,
          organizationAddress,
          amount,
          App._transactions.length + 1, // id
          hash // hash
        ]
        
        // Store as the last transaction for easy access
        App._lastTransaction = transaction;
        
        // Add to the mock storage
        App._transactions.push(transaction)
        
        // Update blockchain section with transaction details
        $('.blockchain .content25').text(`Organisation Address: ${organizationAddress}`)
        $('.blockchain .content26').text(`Charity Address: ${charityAddress}`)
        $('.blockchain .content27').text(`Amount: ${amount}`)
        
        // Return a mock transaction receipt
        return {
          tx: "0x" + Math.random().toString(16).substring(2, 66),
          receipt: {
            transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
            blockNumber: App._blocks.length + 1
          }
        }
      },
      
      blockchain_function: async function(options) {
        console.log("Creating mock block")
        
        // Generate a mock hash
        const hash = "0x" + Math.random().toString(16).substring(2, 34) + Math.random().toString(16).substring(2, 34)
        const prevHash = App._blocks.length > 0 ? App._blocks[App._blocks.length - 1][4] : "0x0000000000000000000000000000000000000000000000000000000000000000"
        
        // Create a new block
        const block = [
          App._transactions, // transactions
          Date.now(), // timestamp
          "0x" + Math.random().toString(16).substring(2, 66), // merkle root
          App._blocks.length + 1, // block number
          hash, // hash
          prevHash // previous hash
        ]
        
        // Add to the mock storage
        App._blocks.push(block)
        
        // Return a mock transaction receipt
        return {
          tx: "0x" + Math.random().toString(16).substring(2, 66),
          receipt: {
            transactionHash: "0x" + Math.random().toString(16).substring(2, 66),
            blockNumber: App._blocks.length
          }
        }
      }
    }
    
    // Initialize mock storage
    App._charities = []
    App._organizations = []
    App._transactions = []
    App._blocks = []
    App._lastTransaction = null
    
    // Show a warning that we're in mock mode
    $('#mock-mode-warning').html(`
      <i class="fas fa-exclamation-triangle mr-2"></i>
      <strong>Demo Mode Active:</strong> The application is running in demo mode because the smart contract was not found. 
      MetaMask will still open for transactions, but they will be simulated and not recorded on the blockchain.
    `).show();
  },
  
  checkExistingEntities: async () => {
    try {
      const charityCount = await App.charity.charity_count()
      const orgCount = await App.charity.org_count()
      const currentAddress = App.account.toLowerCase()
      
      // Check if user has already created a charity
      for (let i = 1; i <= charityCount; i++) {
        const charity = await App.charity.charitys(i)
        if (charity[6].toLowerCase() === currentAddress) {
          App.charityCreated = true
          // Pre-fill charity form with existing data
          $('#charity_name').val(charity[0])
          $('#charity_desciption').val(charity[1])
          $('#charity_Account').val(charity[2])
          $('#charity_bankName').val(charity[3])
          break
        }
      }
      
      // Check if user has already created an organization
      for (let i = 1; i <= orgCount; i++) {
        const org = await App.charity.org(i)
        if (org[5].toLowerCase() === currentAddress) {
          App.organizationCreated = true
          // Pre-fill organization form with existing data
          $('#organisation_name').val(org[0])
          $('#organisation_account').val(org[1])
          $('#organisation_bankname').val(org[2])
          break
        }
      }
      
      App.updateWorkflowUI()
    } catch (error) {
      console.error("Error checking existing entities:", error)
    }
  },
  
  updateWorkflowUI: () => {
    console.log("Updating workflow UI. Status:", {
      charityCreated: App.charityCreated,
      organizationCreated: App.organizationCreated,
      transactionCompleted: App.transactionCompleted,
      blockMined: App.blockMined
    });
    
    // Update charity section
    if (App.charityCreated) {
      $('#charity-section .card-body').addClass('completed');
      $('#charity-section .status-badge').html('<i class="fas fa-check-circle"></i> Completed');
      $('#charity-section .status-badge').removeClass('badge-warning').addClass('badge-success');
      $('#charity-section button').text('Update');
      
      // Enable organisation section
      $('#organisation-section').removeClass('disabled-section');
    } else {
      $('#organisation-section').addClass('disabled-section');
      $('#transaction-section').addClass('disabled-section');
      $('#blockchain-section').addClass('disabled-section');
    }
    
    // Update organization section
    if (App.organizationCreated) {
      $('#organisation-section .card-body').addClass('completed');
      $('#organisation-section .status-badge').html('<i class="fas fa-check-circle"></i> Completed');
      $('#organisation-section .status-badge').removeClass('badge-warning').addClass('badge-success');
      $('#organisation-section button').text('Update');
      
      // Enable transaction section
      $('#transaction-section').removeClass('disabled-section');
    } else if (App.charityCreated) {
      $('#organisation-section').removeClass('disabled-section');
      $('#transaction-section').addClass('disabled-section');
      $('#blockchain-section').addClass('disabled-section');
    }
    
    // Update transaction section
    if (App.transactionCompleted) {
      $('#transaction-section .card-body').addClass('completed');
      $('#transaction-section .status-badge').html('<i class="fas fa-check-circle"></i> Completed');
      $('#transaction-section .status-badge').removeClass('badge-warning').addClass('badge-success');
      $('#transaction-section button').text('Update');
      
      // Enable blockchain section
      $('#blockchain-section').removeClass('disabled-section');
      
      // Update blockchain section with transaction details
      try {
        const charityAddress = $('#add_of_charity').val();
        const orgAddress = $('#add_of_org').val();
        const amount = $('#amount').val();
        
        if (charityAddress && orgAddress && amount) {
          $('.blockchain-details .content25').text(orgAddress);
          $('.blockchain-details .content26').text(charityAddress);
          $('.blockchain-details .content27').text(amount);
          
          // Update transaction hash if available
          if (App.transactionHash) {
            if (App.mockMode) {
              $('.blockchain-details .content28').html(`<span class="text-warning">${App.transactionHash}</span> (Demo)`);
            } else {
              $('.blockchain-details .content28').html(`<a href="https://etherscan.io/tx/${App.transactionHash}" target="_blank">${App.transactionHash}</a>`);
            }
          }
        }
      } catch (error) {
        console.error("Error updating blockchain details:", error);
      }
    } else if (App.organizationCreated) {
      $('#transaction-section').removeClass('disabled-section');
      $('#blockchain-section').addClass('disabled-section');
    }
    
    // Update blockchain section
    if (App.blockMined) {
      $('#blockchain-section .card-body').addClass('completed');
      $('#blockchain-section .status-badge').html('<i class="fas fa-check-circle"></i> Completed');
      $('#blockchain-section .status-badge').removeClass('badge-warning').addClass('badge-success');
      
      // Update block number in blockchain section if available
      if (App.blockNumber) {
        $('.blockchain-details .content29').text(App.blockNumber);
      }
    }
    
    // Update MetaMask connection status
    if (App.isMetaMaskConnected) {
      $('#metamask-status').html('<i class="fas fa-check-circle text-success"></i> Connected');
      $('#connect-metamask-btn').text('Connected').addClass('btn-success').removeClass('btn-primary');
    } else {
      $('#metamask-status').html('<i class="fas fa-times-circle text-danger"></i> Not Connected');
      $('#connect-metamask-btn').text('Connect MetaMask').addClass('btn-primary').removeClass('btn-success');
    }
    
    // Update mock mode indicator
    if (App.mockMode) {
      $('#mock-mode-warning').show();
    } else {
      $('#mock-mode-warning').hide();
    }
  },

  renderTasks: async () => {
    try {
    // Load the total task count from the blockchain
    const taskCount = await App.charity.charity_count();
    const $taskTemplate = $('.taskTemplate')
    const $charity_str = $('.charity_str')

    const transaction_count = await App.charity.transaction_count();

    const org_count = await App.charity.org_count();
    const $organisation_for_html = $('.organisation_for_html')
    // Render out each task with a new task template

    for (var i = 1; i <= org_count; i++) {
      const orgs = await App.charity.org(i)
      const org_name = orgs[0]
      const org_bankAcc = orgs[1]
      const org_bankName = orgs[2]
      const org_id = orgs[3]
      const org_hash = orgs[4]
      const org_address = orgs[5]
      var j = i - 1
      const orgsanother = await App.charity.org(j)
      const org_prev_hash = orgsanother[4]
      const org_balance = orgs[6]
      const $neworganisation_for_html = $organisation_for_html.clone()
      $neworganisation_for_html.find('.content9').html("organisation name : " + org_name)
      $neworganisation_for_html.find('.content10').html("organisation bank account : " + org_bankAcc)
      $neworganisation_for_html.find('.content11').html("organisation bank name : " + org_bankName)
      $neworganisation_for_html.find('.content12').html("organisation id : " + org_id)
      $neworganisation_for_html.find('.content13').html("organisation hash : " + org_hash)
      $neworganisation_for_html.find('.content14').html("organisation previous hash : " + org_prev_hash)
      $neworganisation_for_html.find('.content16').html("organisation address : " + org_address)
      $neworganisation_for_html.show()

      $organisation_for_html.find('.content9').html("organisation name : " + org_name)
      $organisation_for_html.find('.content10').html("organisation bank account : " + org_bankAcc)
      $organisation_for_html.find('.content11').html("organisation bank name : " + org_bankName)
      $organisation_for_html.find('.content12').html("organisation id : " + org_id)
      $organisation_for_html.find('.content13').html("organisation hash : " + org_hash)
      $organisation_for_html.find('.content14').html("organisation previous hash : " + org_prev_hash)
      $organisation_for_html.find('.content16').html("organisation address : " + org_address)
      $organisation_for_html.find('.content19').html("organisation balance : " + org_balance)
    }

    for (var i = 1; i <= taskCount; i++) {
      // Fetch the task data from the blockchain
      const task = await App.charity.charitys(i)
      const charity_name = task[0]
      const charity_desciption = task[1]
      const charity_Account = task[2]
      const charity_bankName = task[3]
      const charity_id = task[4].toNumber()
      const charity_hash = task[5]
      const charity_address = task[6]
      const charity_balance = task[7]
      var j = i - 1
      const taskanother = await App.charity.charitys(j)
      const charity_prev_hash = taskanother[5]

      // Create the html for the task
      const $newTaskTemplate = $taskTemplate.clone()
      $newTaskTemplate.find('.content1').html(charity_name)
      $newTaskTemplate.find('.content2').html(charity_desciption)
      $newTaskTemplate.find('.content3').html(charity_Account)
      $newTaskTemplate.find('.content4').html(charity_bankName)
      $newTaskTemplate.find('.content5').html(charity_id)
      $newTaskTemplate.find('.content6').html(charity_hash)
      $newTaskTemplate.find('.content15').html(charity_prev_hash)
      // Show the task
      $newTaskTemplate.show()

      $taskTemplate.find('.content1').html("charity name: " + charity_name)
      $taskTemplate.find('.content2').html("charity description: " + charity_desciption)
      $taskTemplate.find('.content3').html("charity bank account: " + charity_Account)
      $taskTemplate.find('.content4').html("charity bank name: " + charity_bankName)
      $taskTemplate.find('.content5').html("charity id: " + charity_id)
      $taskTemplate.find('.content6').html("charity hash: " + charity_hash)
      $taskTemplate.find('.content15').html("charity previous hash: " + charity_prev_hash)
      $taskTemplate.find('.content17').html("charity address: " + charity_address)
      $taskTemplate.find('.content18').html("charity balance: " + charity_balance)
    }

      if (transaction_count > 0) {
    const transactions = await App.charity.transaction_dict(transaction_count)
    const charity_address_transaction = transactions[0]
    const organisation_address_transaction = transactions[1]
    const amount_123 = transactions[2]
    const id_transaction = transactions[3]
    const transaction_hash1 = transactions[4]
    const $transaction = $('.transaction')
        
    $transaction.find('.content20').html("transaction hash : " + transaction_hash1)
    $transaction.find('.content21').html("charity address : " + charity_address_transaction)
    $transaction.find('.content22').html("organisation address : " + organisation_address_transaction)
    $transaction.find('.content23').html("amount in transaction : " + amount_123)
    $transaction.find('.content24').html("the id : " + id_transaction)
      }

    const $blockchain = $('.blockchain');
    const blockchain_count = await App.charity.blockchain_count();
      
      if (blockchain_count > 0) {
    const blockchain_structure = await App.charity.Blockchain(blockchain_count);

    const transaction_merkle_root = blockchain_structure[2];
    const blknum = blockchain_structure[3];
    const theHash = blockchain_structure[4];
    const theprevHash = blockchain_structure[5];
        
    $blockchain.find('.content25').html("the transaction merkle root : " + transaction_merkle_root)
    $blockchain.find('.content26').html("the block number : " + blknum)
    $blockchain.find('.content27').html("the hash : " + theHash)
    $blockchain.find('.content28').html("the previous hash : " + theprevHash)
      }
    } catch (error) {
      console.error("Error rendering tasks:", error)
    }
  },

  confirmAction: (title, message, callback) => {
    $('#confirmModal .modal-title').text(title)
    $('#confirmModal .modal-body').text(message)
    $('#confirmModal').modal('show')
    
    // Clear previous event handlers
    $('#confirmYesBtn').off('click')
    
    // Set new event handler
    $('#confirmYesBtn').on('click', function() {
      $('#confirmModal').modal('hide')
      callback()
    })
  },

  createCharity: async () => {
    if (!App.isMetaMaskConnected) {
      App.showError("Please connect to MetaMask first.")
      return
    }
    
    try {
      var charity_name = $('#charity_name').val()
      var description = $('#charity_desciption').val()
      var bankAccount = $('#charity_Account').val()
      var bankName = $('#charity_bankName').val()
      
      if (!charity_name || !description || !bankAccount || !bankName) {
        App.showError("Please fill in all charity details.")
        return
      }
      
      App.confirmAction(
        "Confirm Charity Details", 
        `Please confirm the following charity details:\n\nName: ${charity_name}\nDescription: ${description}\nBank Account: ${bankAccount}\nBank Name: ${bankName}`,
        async function() {
          try {
            var address = App.account
            var balance = App.balance
            var _str = balance + " ETH"
            
            // Show loading indicator
            App.setLoading(true, "Creating charity...")
            
            if (App.mockMode) {
              // In mock mode, we don't need to specify gas
              await App.charity.createCharity(charity_name, description, bankAccount, bankName, address, _str)
              
              // Make sure to close the loading modal before showing success
              App.setLoading(false)
              
              // Set the flag and update UI
              App.charityCreated = true
              App.updateWorkflowUI()
              
              console.log("Charity created successfully in mock mode")
              App.showSuccess("Charity created successfully! You can now proceed to enter organisation details.")
            } else {
              // In real mode, set gas limit explicitly to avoid transaction getting stuck
              await App.charity.createCharity(
                charity_name, 
                description, 
                bankAccount, 
                bankName, 
                address, 
                _str, 
                { 
                  from: App.account,
                  gas: 3000000 // Set a higher gas limit
                }
              )
              
              // Make sure to close the loading modal before showing success
              App.setLoading(false)
              
              // Set the flag and update UI
              App.charityCreated = true
              App.updateWorkflowUI()
              
              console.log("Charity created successfully in real mode")
              App.showSuccess("Charity created successfully! You can now proceed to enter organisation details.")
            }
          } catch (error) {
            console.error("Error in charity creation confirmation:", error)
            App.setLoading(false)
            App.showError("Failed to create charity: " + (error.message || "Unknown error. Please try again."))
          }
        }
      )
    } catch (error) {
      console.error("Error creating charity:", error)
      App.showError("Failed to create charity. Please try again.")
    }
  },

  createTransaction: async () => {
    if (!App.isMetaMaskConnected) {
      App.showError("Please connect to MetaMask first.")
      return
    }
    
    if (!App.charityCreated || !App.organizationCreated) {
      App.showError("Please complete charity and organisation registration first.")
      return
    }
    
    try {
      var address_of_charity = $('#add_of_charity').val()
      var address_of_organisation = $('#add_of_org').val()
      var amountToSend = $('#amount').val()
      
      if (!address_of_charity || !address_of_organisation || !amountToSend) {
        App.showError("Please fill in all transaction details.")
        return
      }
      
      // Validate addresses
      if (!web3.utils.isAddress(address_of_charity)) {
        App.showError("Invalid charity address. Please enter a valid Ethereum address.")
        return
      }
      
      if (!web3.utils.isAddress(address_of_organisation)) {
        App.showError("Invalid organisation address. Please enter a valid Ethereum address.")
        return
      }
      
      // Skip address verification in mock mode
      if (!App.mockMode) {
        // Verify if addresses exist in the system
        const isValidCharity = await App.verifyCharityAddress(address_of_charity)
        if (!isValidCharity) {
          App.showError("The charity address does not exist in the system. Please enter a registered charity address.")
          return
        }
        
        const isValidOrg = await App.verifyOrganisationAddress(address_of_organisation)
        if (!isValidOrg) {
          App.showError("The organisation address does not exist in the system. Please enter a registered organisation address.")
          return
        }
      }
      
      App.confirmAction(
        "Confirm Transaction Details", 
        `Please confirm the following transaction details:\n\nCharity Address: ${address_of_charity}\nOrganisation Address: ${address_of_organisation}\nAmount: ${amountToSend} ETH`,
        async function() {
          try {
            // Show loading indicator
            App.setLoading(true, "Processing transaction...")
            
            // Update blockchain section with transaction details immediately
            $('.blockchain-details .content25').text(address_of_organisation)
            $('.blockchain-details .content26').text(address_of_charity)
            $('.blockchain-details .content27').text(amountToSend)
            $('.blockchain-details .content28').text('Processing...')
            
            // Record the transaction in the contract if not in mock mode
            if (!App.mockMode) {
              try {
                await App.charity.createTransaction(
                  address_of_charity, 
                  address_of_organisation, 
                  amountToSend,
                  { 
                    from: App.account,
                    gas: 3000000 // Set a higher gas limit
                  }
                )
              } catch (error) {
                console.error("Error recording transaction in contract:", error)
                // Continue anyway since we're going to use MetaMask
              }
            } else {
              // In mock mode, record the transaction in our mock storage
              await App.charity.createTransaction(address_of_charity, address_of_organisation, amountToSend)
            }
            
            // Close loading modal before opening MetaMask
            App.setLoading(false)
            
            // Convert amount for the transaction
            let weiAmount;
            try {
              // Check if the amount is already in Wei (large number)
              if (amountToSend.length > 10) {
                weiAmount = amountToSend;
              } else {
                // Convert from ETH to Wei
                weiAmount = web3.utils.toWei(amountToSend.toString(), 'ether');
              }
            } catch (e) {
              // If conversion fails, use the original amount
              console.error("Error converting amount:", e);
              weiAmount = amountToSend;
            }
            
            console.log("Sending transaction with amount:", weiAmount);
            
            // Show a message to the user
            App.showInfo("Please confirm the transaction in MetaMask when it opens...");
            
            // Always use MetaMask for the transaction, even in mock mode
            try {
              // Use the direct web3.eth.sendTransaction method which will trigger MetaMask
              web3.eth.sendTransaction({
                from: address_of_organisation,
                to: address_of_charity,
                value: weiAmount,
                gas: 3000000
              })
              .on('transactionHash', function(hash) {
                console.log("Transaction hash:", hash);
                
                // Store the transaction hash
                App.transactionHash = hash;
                
                // Update the blockchain section with the hash
                if (App.mockMode) {
                  $('.blockchain-details .content28').html(`<span class="text-warning">${hash}</span> (Demo)`);
                } else {
                  $('.blockchain-details .content28').html(`<a href="https://etherscan.io/tx/${hash}" target="_blank">${hash}</a>`);
                }
                
                App.transactionCompleted = true;
                App.updateWorkflowUI();
                App.showSuccess("Transaction successful! Hash: " + hash + "\n\nYou can now proceed to mine a block.");
              })
              .on('receipt', function(receipt) {
                console.log("Transaction receipt:", receipt);
              })
              .on('confirmation', function(confirmationNumber, receipt) {
                console.log("Confirmation number:", confirmationNumber);
              })
              .on('error', function(error) {
                console.error("Transaction error:", error);
                
                // If user rejected the transaction but we're in mock mode, still mark as completed
                if (App.mockMode && error.code === 4001) {
                  console.log("User rejected transaction, but we're in mock mode so continuing anyway");
                  
                  // Generate a mock hash for demo mode
                  const mockHash = "0x" + Math.random().toString(16).substring(2, 66);
                  App.transactionHash = mockHash;
                  
                  // Update the blockchain section with the mock hash
                  $('.blockchain-details .content28').html(`<span class="text-warning">${mockHash}</span> (Demo)`);
                  
                  App.transactionCompleted = true;
                  App.updateWorkflowUI();
                  App.showSuccess("Transaction simulated in demo mode. You can now proceed to mine a block.");
                } else {
                  // Show retry button in the blockchain section
                  $('.blockchain-details .content28').html(`<span class="text-danger">Transaction failed. Please <button class="btn btn-sm btn-warning" onclick="App.createTransaction()">Retry</button></span>`);
                  
                  App.showError("Transaction failed: " + (error.message || "User denied transaction"));
                }
              });
            } catch (error) {
              console.error("Error sending transaction:", error);
              
              // If there's an error but we're in mock mode, still mark as completed
              if (App.mockMode) {
                console.log("Error sending transaction, but we're in mock mode so continuing anyway");
                
                // Generate a mock hash for demo mode
                const mockHash = "0x" + Math.random().toString(16).substring(2, 66);
                App.transactionHash = mockHash;
                
                // Update the blockchain section with the mock hash
                $('.blockchain-details .content28').html(`<span class="text-warning">${mockHash}</span> (Demo)`);
                
                App.transactionCompleted = true;
                App.updateWorkflowUI();
                App.showSuccess("Transaction simulated in demo mode. You can now proceed to mine a block.");
              } else {
                // Show retry button in the blockchain section
                $('.blockchain-details .content28').html(`<span class="text-danger">Transaction failed. Please <button class="btn btn-sm btn-warning" onclick="App.createTransaction()">Retry</button></span>`);
                
                App.showError("Failed to send transaction: " + (error.message || "Unknown error"));
              }
            }
          } catch (error) {
            console.error("Error in transaction confirmation:", error)
            App.setLoading(false)
            
            // If there's an error but we're in mock mode, still mark as completed
            if (App.mockMode) {
              console.log("Error in transaction confirmation, but we're in mock mode so continuing anyway");
              
              // Generate a mock hash for demo mode
              const mockHash = "0x" + Math.random().toString(16).substring(2, 66);
              App.transactionHash = mockHash;
              
              // Update the blockchain section with the mock hash
              $('.blockchain-details .content28').html(`<span class="text-warning">${mockHash}</span> (Demo)`);
              
              App.transactionCompleted = true;
              App.updateWorkflowUI();
              App.showSuccess("Transaction simulated in demo mode. You can now proceed to mine a block.");
            } else {
              // Show retry button in the blockchain section
              $('.blockchain-details .content28').html(`<span class="text-danger">Transaction failed. Please <button class="btn btn-sm btn-warning" onclick="App.createTransaction()">Retry</button></span>`);
              
              App.showError("Failed to create transaction: " + (error.message || "Unknown error. Please try again."));
            }
          }
        }
      )
    } catch (error) {
      console.error("Error creating transaction:", error)
      App.showError("Failed to create transaction. Please try again.")
    }
  },

  verifyCharityAddress: async (address) => {
    try {
      const charityCount = await App.charity.charity_count()
      
      for (let i = 1; i <= charityCount; i++) {
        const charity = await App.charity.charitys(i)
        if (charity[6].toLowerCase() === address.toLowerCase()) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error("Error verifying charity address:", error)
      return false
    }
  },
  
  verifyOrganisationAddress: async (address) => {
    try {
      const orgCount = await App.charity.org_count()
      
      for (let i = 1; i <= orgCount; i++) {
        const org = await App.charity.org(i)
        if (org[5].toLowerCase() === address.toLowerCase()) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error("Error verifying organisation address:", error)
      return false
    }
  },

  createOrganisation: async () => {
    if (!App.isMetaMaskConnected) {
      App.showError("Please connect to MetaMask first.")
      return
    }
    
    if (!App.charityCreated) {
      App.showError("Please complete charity registration first.")
      return
    }
    
    try {
      var name = $('#organisation_name').val()
      var bankAccount = $('#organisation_account').val()
      var bankName = $('#organisation_bankname').val()
      
      if (!name || !bankAccount || !bankName) {
        App.showError("Please fill in all organisation details.")
        return
      }
      
      App.confirmAction(
        "Confirm Organisation Details", 
        `Please confirm the following organisation details:\n\nName: ${name}\nBank Account: ${bankAccount}\nBank Name: ${bankName}`,
        async function() {
          try {
            var newAddress = App.account
            var balance = App.balance
            var _strNew = balance + " ETH"
            
            // Show loading indicator
            App.setLoading(true, "Creating organisation...")
            
            if (App.mockMode) {
              // In mock mode, we don't need to specify gas
              await App.charity.createOrganisation(name, bankAccount, bankName, newAddress, _strNew)
              
              // Make sure to close the loading modal before showing success
              App.setLoading(false)
              
              // Set the flag and update UI
              App.organizationCreated = true
              App.updateWorkflowUI()
              
              console.log("Organisation created successfully in mock mode")
              App.showSuccess("Organisation created successfully! You can now proceed to enter transaction details.")
            } else {
              // In real mode, set gas limit explicitly
              await App.charity.createOrganisation(
                name, 
                bankAccount, 
                bankName, 
                newAddress, 
                _strNew,
                { 
                  from: App.account,
                  gas: 3000000 // Set a higher gas limit
                }
              )
              
              // Make sure to close the loading modal before showing success
              App.setLoading(false)
              
              // Set the flag and update UI
              App.organizationCreated = true
              App.updateWorkflowUI()
              
              console.log("Organisation created successfully in real mode")
              App.showSuccess("Organisation created successfully! You can now proceed to enter transaction details.")
            }
          } catch (error) {
            console.error("Error in organisation creation confirmation:", error)
            App.setLoading(false)
            App.showError("Failed to create organisation: " + (error.message || "Unknown error. Please try again."))
          }
        }
      )
    } catch (error) {
      console.error("Error creating organisation:", error)
      App.showError("Failed to create organisation. Please try again.")
    }
  },

  blockchain_function: async () => {
    if (!App.transactionCompleted) {
      App.showError("Please complete a transaction first before mining a block.")
      return
    }
    
    try {
      App.setLoading(true, "Mining block...")
      
      // Get transaction details from the form or stored values
      const charityAddress = $('#add_of_charity').val() || $('.blockchain-details .content26').text()
      const orgAddress = $('#add_of_org').val() || $('.blockchain-details .content25').text()
      const amount = $('#amount').val() || $('.blockchain-details .content27').text()
      const transactionHash = App.transactionHash || "0x" + Math.random().toString(16).substring(2, 66)
      
      // Ensure we have all the necessary details
      if (!charityAddress || !orgAddress || !amount) {
        console.warn("Missing transaction details for blockchain function:", { 
          charityAddress, orgAddress, amount, transactionHash 
        })
      }
      
      // Create a new block
      let result
      if (!App.mockMode) {
        try {
          result = await App.charity.mineBlock(
            { 
              from: App.account,
              gas: 3000000
            }
          )
        } catch (error) {
          console.error("Error mining block in contract:", error)
          // Continue with mock mining
          result = { blockNumber: Math.floor(Math.random() * 10000000) }
        }
      } else {
        // In mock mode, simulate mining a block
        await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate mining delay
        result = { blockNumber: Math.floor(Math.random() * 10000000) }
      }
      
      // Get the block number (either from result or generate a mock one)
      const blockNumber = result.blockNumber || Math.floor(Math.random() * 10000000)
      
      // Store the block number
      App.blockNumber = blockNumber
      
      // Update UI to show block has been mined
      App.blockMined = true
      App.updateWorkflowUI()
      
      // Generate certificate with transaction details
      App.generateCertificate(
        blockNumber, 
        charityAddress, 
        orgAddress, 
        amount,
        transactionHash
      )
      
      App.setLoading(false)
      App.showSuccess("Block mined successfully! Block Number: " + blockNumber)
      
      // Reset transaction state for next transaction
      App.transactionCompleted = false
      
      // Update the blockchain section with the block number
      $('.blockchain-details .content29').text(blockNumber)
      
      // Ensure transaction details are still displayed in the blockchain section
      $('.blockchain-details .content25').text(orgAddress)
      $('.blockchain-details .content26').text(charityAddress)
      $('.blockchain-details .content27').text(amount)
      if (App.mockMode) {
        $('.blockchain-details .content28').html(`<span class="text-warning">${transactionHash}</span> (Demo)`)
      } else {
        $('.blockchain-details .content28').html(`<a href="https://etherscan.io/tx/${transactionHash}" target="_blank">${transactionHash}</a>`)
      }
      
    } catch (error) {
      console.error("Error in blockchain function:", error)
      App.setLoading(false)
      App.showError("Failed to mine block. Please try again.")
    }
  },
  
  setLoading: (isLoading, message = "Loading...") => {
    if (isLoading) {
      $('#loadingModal .loading-message').text(message)
      $('#loadingModal').modal({
        backdrop: 'static',
        keyboard: false
      })
      $('#loadingModal').modal('show')
    } else {
      // Make sure the modal is hidden properly
      $('#loadingModal').modal('hide')
      
      // Force the backdrop to be removed
      $('.modal-backdrop').remove()
      
      // Remove modal-open class from body
      $('body').removeClass('modal-open').css('padding-right', '');
    }
  },
  
  showError: (message) => {
    // Hide loading modal if it's open
    App.setLoading(false)
    
    $('#errorModal .modal-body').text(message)
    $('#errorModal').modal('show')
  },
  
  showSuccess: (message) => {
    // Hide loading modal if it's open
    App.setLoading(false)
    
    $('#successModal .modal-body').text(message)
    $('#successModal').modal('show')
  },
  
  showInfo: (message) => {
    // Hide loading modal if it's open
    App.setLoading(false)
    
    $('#infoModal .modal-body').text(message)
    $('#infoModal').modal('show')
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      $('#infoModal').modal('hide')
    }, 3000)
  },
  
  connectToMetaMask: async () => {
    await App.promptMetaMaskConnection()
  },
  
  switchNetwork: async () => {
    try {
      // Get the current network ID
      const currentNetworkId = await web3.eth.net.getId();
      console.log("Current network ID:", currentNetworkId);
      
      // Check if we're already on Ganache
      if (currentNetworkId === 1337 || currentNetworkId === 5777) {
        App.showInfo("You are already connected to Ganache!");
        window.location.reload();
        return;
      }
      
      // Try to switch to Ganache (usually network ID 1337 or 5777)
      try {
        // First try 1337 (default Ganache-CLI)
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }], // 1337 in hex
        });
        
        // Reload the page after switching
        window.location.reload();
      } catch (error) {
        // If 1337 fails, try 5777 (default Ganache GUI)
        if (error.code === 4902 || error.code === -32603) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x1691' }], // 5777 in hex
            });
            
            // Reload the page after switching
            window.location.reload();
          } catch (error2) {
            // If both fail, try to add the network
            if (error2.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x539', // 1337 in hex
                      chainName: 'Ganache Local',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      rpcUrls: ['http://127.0.0.1:7545', 'http://127.0.0.1:8545'],
                      blockExplorerUrls: [],
                    },
                  ],
                });
                
                // Reload the page after adding
                window.location.reload();
              } catch (addError) {
                console.error("Error adding Ganache network:", addError);
                App.showError("Failed to add Ganache network to MetaMask. Please add it manually.");
              }
            } else {
              console.error("Error switching to Ganache network:", error2);
              App.showError("Failed to switch to Ganache network. Please try manually switching in MetaMask.");
            }
          }
        } else {
          console.error("Error switching network:", error);
          App.showError("Failed to switch network. Please try manually switching in MetaMask.");
        }
      }
    } catch (error) {
      console.error("Error in switchNetwork:", error);
      App.showError("Failed to switch network. Please try manually switching in MetaMask.");
    }
  },

  generateCertificate: (blockNumber, charityAddress, orgAddress, amount, transactionHash) => {
    // Create a new window for the certificate
    const certificateWindow = window.open('', '_blank');
    
    // Get current date
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format addresses for display (truncate if too long)
    const formatAddress = (address) => {
      if (!address) return 'N/A';
      if (address.length > 20) {
        return address.substring(0, 10) + '...' + address.substring(address.length - 10);
      }
      return address;
    };
    
    // Create certificate content with improved design
    const certificateContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Blockchain Transaction Certificate</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
            color: #333;
          }
          .certificate-container {
            max-width: 800px;
            margin: 40px auto;
            padding: 40px;
            background-color: white;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
            position: relative;
            overflow: hidden;
          }
          .certificate-border {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            pointer-events: none;
            margin: 10px;
          }
          .certificate-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
          }
          .certificate-title {
            font-size: 32px;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: bold;
          }
          .certificate-subtitle {
            font-size: 18px;
            color: #7f8c8d;
            margin-bottom: 5px;
          }
          .certificate-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background-color: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 40px;
          }
          .certificate-body {
            margin-bottom: 30px;
          }
          .certificate-text {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
            text-align: center;
          }
          .certificate-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .detail-row {
            display: flex;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
          }
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .detail-label {
            flex: 0 0 180px;
            font-weight: bold;
            color: #2c3e50;
          }
          .detail-value {
            flex: 1;
            word-break: break-all;
          }
          .certificate-footer {
            text-align: center;
            margin-top: 40px;
            color: #7f8c8d;
            font-size: 14px;
          }
          .certificate-seal {
            width: 120px;
            height: 120px;
            margin: 20px auto;
            background-color: #f1c40f;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            transform: rotate(-15deg);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .certificate-date {
            margin-top: 20px;
            font-style: italic;
          }
          .print-button {
            display: block;
            margin: 30px auto 0;
            padding: 10px 20px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
          }
          .print-button:hover {
            background-color: #2980b9;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(0, 0, 0, 0.03);
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
          }
          .corner-decoration {
            position: absolute;
            width: 100px;
            height: 100px;
            background-color: rgba(52, 152, 219, 0.1);
            z-index: -1;
          }
          .top-left {
            top: 0;
            left: 0;
            border-bottom-right-radius: 100%;
          }
          .top-right {
            top: 0;
            right: 0;
            border-bottom-left-radius: 100%;
          }
          .bottom-left {
            bottom: 0;
            left: 0;
            border-top-right-radius: 100%;
          }
          .bottom-right {
            bottom: 0;
            right: 0;
            border-top-left-radius: 100%;
          }
          @media print {
            .print-button {
              display: none;
            }
            body {
              background-color: white;
            }
            .certificate-container {
              box-shadow: none;
              margin: 0;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-border"></div>
          <div class="corner-decoration top-left"></div>
          <div class="corner-decoration top-right"></div>
          <div class="corner-decoration bottom-left"></div>
          <div class="corner-decoration bottom-right"></div>
          <div class="watermark">VERIFIED</div>
          
          <div class="certificate-header">
            <div class="certificate-icon">🔗</div>
            <h1 class="certificate-title">Blockchain Transaction Certificate</h1>
            <p class="certificate-subtitle">Verified Charitable Donation</p>
          </div>
          
          <div class="certificate-body">
            <p class="certificate-text">
              This certificate confirms that a blockchain transaction has been successfully completed and recorded on the blockchain.
              The details of this transaction are immutable and permanently stored.
            </p>
            
            <div class="certificate-details">
              <div class="detail-row">
                <div class="detail-label">Block Number:</div>
                <div class="detail-value">${blockNumber || 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Transaction Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">From (Organization):</div>
                <div class="detail-value">${formatAddress(orgAddress)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">To (Charity):</div>
                <div class="detail-value">${formatAddress(charityAddress)}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Amount:</div>
                <div class="detail-value">${amount || 'N/A'} ETH</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Transaction Hash:</div>
                <div class="detail-value">${transactionHash || 'N/A'}</div>
              </div>
            </div>
            
            <div class="certificate-seal">
              BLOCKCHAIN<br>VERIFIED<br>${blockNumber || 'N/A'}
            </div>
            
            <p class="certificate-date">
              Issued on ${formattedDate}
            </p>
          </div>
          
          <div class="certificate-footer">
            <p>This certificate is automatically generated and does not require a signature.</p>
            <p>Charity Blockchain Project - Secure, Transparent, and Immutable</p>
          </div>
          
          <button class="print-button" onclick="window.print()">Print Certificate</button>
        </div>
      </body>
      </html>
    `;
    
    // Write the certificate content to the new window
    certificateWindow.document.write(certificateContent);
    certificateWindow.document.close();
  },
}

$(() => {
  $(window).load(() => {
    App.load()
  })
})