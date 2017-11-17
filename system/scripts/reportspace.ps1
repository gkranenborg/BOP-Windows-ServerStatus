$users = "gerben.kranenborg@us.fujitsu.com", "neal.wang@us.fujitsu.com", "mahesh.giri@in.fujitsu.com", "faisal.ansari@in.fujitsu.com"
$diskReport = "D:\Cordys\Development\webroot\shared\system\system\reports\DiskSpaceRpt.json";
$alertFile = "D:\Cordys\Development\webroot\shared\system\system\reports\AlertRpt.json";
$dbReport = "D:\Cordys\Development\webroot\shared\system\system\reports\DBSpaceRpt.json";
$datetimereport = "D:\Cordys\Development\webroot\shared\system\system\reports\DateTimeRpt.json";
$servicesreport = "D:\Cordys\Development\webroot\shared\system\system\reports\Services.json";
$utilizationreport = "D:\Cordys\Development\webroot\shared\system\system\reports\Utilization.json";
$errorlog = "D:\Program Files\Microsoft SQL Server\MSSQL10_50.MSSQLSERVER\MSSQL\Log\ERRORLOG"
$errorsRpt = "D:\Cordys\Development\webroot\shared\system\system\reports\DbLogs.json"
$redColor = "#FF0000"
$computer = "FSKS-Server"
$smtpServer = "127.0.0.1"

# Remove all temporary reports.

If (Test-Path $diskReport) 
    { 
        Remove-Item $diskReport 
    }
	
if (Test-Path $datetimereport)
	{
	Remove-Item $datetimereport
	}
	
if (Test-Path $dbReport)
	{
	Remove-Item $dbReport
	}
	
if (Test-Path $servicesreport)
	{
	Remove-Item $servicesreport
	}
	
if (Test-Path $utilizationreport)
	{
	Remove-Item $utilizationreport
	}
	
if (Test-Path $errorsRpt)
	{
	Remove-Item $errorsRpt
	}

# Create the DB log overview.
	
$CurrentDate = Get-Date -format "yyyy-MM-dd"
$logentryCordys = (Get-Content $errorlog | Select-String -Pattern Backup | Select-String -Pattern $CurrentDate | Select-String -Pattern "Cordys,") -replace '\\' , '/';
$logentryCordysBus = (Get-Content $errorlog | Select-String -Pattern Backup | Select-String -Pattern $CurrentDate | Select-String -Pattern "CordysBusiness,") -replace "\\" , "/";
$datarow = "[";
Add-Content -Encoding UTF8 $errorsRpt $datarow
$datarow = "{`"logentry`":`"$logentryCordys`"},"
Add-Content -Encoding UTF8 $errorsRpt $datarow
$datarow = "{`"logentry`":`"$logentryCordysBus`"}"
Add-Content -Encoding UTF8 $errorsRpt $datarow
$datarow = "]";
Add-Content -Encoding UTF8 $errorsRpt $datarow
	
# Check all O.S. Services and alert if they are not running.

$srvArray = ('OpenLDAP-slapd Development','Cordys Monitor Development','Jackrabbit','James 3.0-beta5','IISADMIN','MSSQLSERVER','MSSQLServerOLAPService','MsDtsServer100','ReportServer','SQLWriter','W3SVC')
$dataRow = "["
Add-Content -Encoding UTF8 $servicesreport $dataRow
$srvDown = '';
foreach ($i in $srvArray)
 {

$colItems = Get-WmiObject -query "Select * From Win32_Service where name = '$i'"

    if ($colItems.state -ne "Running")
      {
			$srvDown += $i;
			$srvDown += ', ';
            $dataRow = "{`"service`":`"$i`",`"status`":`"Stopped`"},"
			Add-Content -Encoding UTF8 $servicesreport $dataRow;
      }
   else
      {
            $dataRow = "{`"service`":`"$i`",`"status`":`"Running`"},"
            Add-Content -Encoding UTF8 $servicesreport $dataRow; 
      }   
  }
$file = Get-Content $servicesreport
for($j = $file.count;$j -ge 0;$j--){if($file[$j] -match ","){$file[$j] = $file[$j] -replace "},", "}";break}}
Remove-Item $servicesreport
Add-Content -Encoding UTF8 $servicesreport $file
$dataRow = "]"
Add-Content -Encoding UTF8 $servicesreport $dataRow;
if ( $srvDown )
{
$body=@"
The following Service(s) on the FSKS Development server is / are not running : $srvDown
"@
	Send-MailMessage -To $users -Body $body -Subject 'Services ALERT FS Development Server' -from 'mail@bop.feinsuch.com' -smtpServer '127.0.0.1'
	If (Test-Path $alertFile) 
	{ 
		$stream = [IO.File]::OpenWrite('D:\Cordys\Development\webroot\shared\system\system\reports\AlertRpt.json')
		$stream.SetLength($stream.Length - 4)
		$stream.Close()
		$stream.Dispose()
		$dataRow =","
		Add-Content -Encoding UTF8 $alertFile $dataRow;
		}
		else
		{
		$dataRow = "["
		Add-Content $alertFile $dataRow;
		}
		$CurrentDate = Get-Date -format "MM/dd/yyyy HH:mm:ss"
		$dataRow = "{`"Date`":`"$CurrentDate`",`"Type`":`"ServiceAlert`",`"Alert`":`"$srvDown down`"}"
		Add-Content $alertFile $dataRow
		$dataRow = "]"
		Add-Content $alertFile $dataRow
}

# Add the current date and time as well as the last (re)boot time to the date report.

$boottime = ((Get-WmiObject Win32_OperatingSystem).ConvertToDateTime((Get-WmiObject Win32_OperatingSystem).LastBootUpTime));
$currenttime = Get-Date
$dataRow = "{`"datetime`":`"$currenttime`",`"boottime`":`"$boottime`",`"cpus`":`"1`",`"cores`":`"4`",`"ram`":`"30`",`"os`":`"Windows Server 2008 R2 Standard`",`"db`":`"MS SQL 2008 R2`",`"application`":`"BOP 4.3 D1.003.008`"}"
Add-Content $datetimereport $dataRow

# Determine CPU, Av. CPU, RAM and Network utilization.

$cpu = (Get-WmiObject win32_processor).LoadPercentage
$avcpu = Get-WmiObject win32_processor | Measure-Object -property LoadPercentage -Average | Foreach {$_.Average}
$ram = Get-WmiObject win32_operatingsystem | Foreach {"{0:N2}" -f ((($_.TotalVisibleMemorySize - $_.FreePhysicalMemory)*100)/ $_.TotalVisibleMemorySize)}
$dataRow = "{`"cpu`":`"$cpu`",`"avcpu`":`"$avcpu`",`"ram`":`"$ram`"}"
Add-Content $utilizationreport $dataRow

# Check the database files for size and create the DB report.

$databases = "Cordys.mdf", "Cordys_log.ldf", "CordysDataLoad.mdf", "CordysDataLoad_log.ldf", "CordysStaging.mdf", "CordysStaging_1.ldf", "development-bus.mdf", "development-bus.ldf"
$databasepath = "D:\Program Files\Microsoft SQL Server\MSSQL10_50.MSSQLSERVER\MSSQL\DATA"
$dbdatarow = "["
Add-Content $dbReport $dbdatarow;
foreach($database in $databases)
	{
		$databasefullpath = join-path "$databasepath" "$database"
		$dbsize = Get-Item "$databasefullpath"
		$dbsizeGB = [Math]::Round($dbsize.Length / 1073741824, 2);
		$dbdatarow = "{`"DBname`":`"$database`",`"DBsize`":`"$dbsizeGB`"},"
		Add-Content $dbReport $dbdatarow;
	}
$file = Get-Content $dbReport
for($i = $file.count;$i -ge 0;$i--){if($file[$i] -match ","){$file[$i] = $file[$i] -replace "},", "}";break}}
Remove-Item $dbReport
Add-Content $dbReport $file
$dbdatarow = "]"
Add-Content $dbReport $dbdatarow;

# Check all fixed disk for % of free space and alert if below the tresholds.

$disks = Get-WmiObject -ComputerName $computer -Class Win32_LogicalDisk -Filter "DriveType = 3" 
$dataRow = "["
Add-Content $diskReport $dataRow;
foreach($disk in $disks) 
 {          
  $deviceID = $disk.DeviceID; 
  $volName = $disk.VolumeName; 
  [float]$size = $disk.Size; 
  [float]$freespace = $disk.FreeSpace;  
  $percentFree = [Math]::Round(($freespace / $size) * 100, 2); 
  $sizeGB = [Math]::Round($size / 1073741824, 2); 
  $freeSpaceGB = [Math]::Round($freespace / 1073741824, 2); 
  $usedSpaceGB = $sizeGB - $freeSpaceGB; 

  if($percentFree -lt 25) 
    { 
        $color = $redColor 
    } 
	   
    $dataRow = "{`"server`":`"$computer`",`"drive`":`"$deviceID`",`"size`":`"$sizeGB`",`"used`":`"$usedSpaceGB`",`"free`":`"$freeSpaceGB`",`"percent`":`"$percentFree`"},"
Add-Content $diskReport $datarow		
  if ($deviceID -eq "C:")
     {
	    if ($percentFree -lt 10)
		{
$body=@"
The disk space on the FSKS Development server for drive C: is low. Please check the server ASAP. ($deviceID $freeSpaceGB (Gb.))
"@
		  Send-MailMessage -To $users -Body $body -Subject 'Disk Space ALERT FS Development Server' -from 'mail@bop.feinsuch.com' -smtpServer '127.0.0.1'
		 If (Test-Path $alertFile) 
		{ 
			$stream = [IO.File]::OpenWrite('D:\Cordys\Development\webroot\shared\system\system\reports\AlertRpt.json')
			$stream.SetLength($stream.Length - 3)
			$stream.Close()
			$stream.Dispose()
			$dataRow =","
			Add-Content -Encoding UTF8 $alertFile $dataRow;
		}
		else
		{
			$dataRow = "["
			Add-Content $alertFile $dataRow;
		}
			$CurrentDate = Get-Date -format "MM/dd/yyyy HH:mm:ss"
			$dataRow = "{`"Date`":`"$CurrentDate`",`"Type`":`"DiskSpace`",`"Alert`":`"$deviceID  $freeSpaceGB Gb.`"}"
			Add-Content $alertFile $dataRow
			$dataRow = "]"
			Add-Content $alertFile $dataRow
		}
	  }
	   else {
        if ($percentFree -lt 16) 
        { 
$body=@"
The disk space on the FSKS Development server for drive D: or E: is low. Please check the server ASAP. ($deviceID $freeSpaceGB (Gb.))
"@
          Send-MailMessage -To $users -Body $body -Subject 'Disk Space ALERT FS Development Server' -from 'mail@bop.feinsuch.com' -smtpServer '127.0.0.1'
		  		 If (Test-Path $alertFile) 
		{ 
			$stream = [IO.File]::OpenWrite('D:\Cordys\Development\webroot\shared\system\system\reports\AlertRpt.json')
			$stream.SetLength($stream.Length - 3)
			$stream.Close()
			$stream.Dispose()
			$dataRow =","
			Add-Content -Encoding UTF8 $alertFile $dataRow;
		}
		else
		{
			$dataRow = "["
			Add-Content $alertFile $dataRow;
		}
			$CurrentDate = Get-Date -format "MM/dd/yyyy HH:mm:ss"
			$dataRow = "{`"Date`":`"$CurrentDate`",`"Type`":`"DiskSpace`",`"Alert`":`"$deviceID  $freeSpaceGB Gb.`"}"
			Add-Content $alertFile $dataRow
			$dataRow = "]"
			Add-Content $alertFile $dataRow
        } }
}
$file = Get-Content $diskReport
for($i = $file.count;$i -ge 0;$i--){if($file[$i] -match ","){$file[$i] = $file[$i] -replace "},", "}";break}}
Remove-Item $diskReport
Add-Content $diskReport $file
$dataRow = "]"
Add-Content $diskReport $dataRow;
