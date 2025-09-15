package com.qbrain.smartwaste.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.qbrain.smartwaste.R
import com.qbrain.smartwaste.databinding.ItemNearbyBinBinding
import com.qbrain.smartwaste.network.NearbyBin

class NearbyBinsAdapter(
    private val bins: List<NearbyBin>,
    private val onBinClick: (NearbyBin) -> Unit
) : RecyclerView.Adapter<NearbyBinsAdapter.BinViewHolder>() {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BinViewHolder {
        val binding = ItemNearbyBinBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return BinViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: BinViewHolder, position: Int) {
        holder.bind(bins[position])
    }
    
    override fun getItemCount(): Int = bins.size
    
    inner class BinViewHolder(private val binding: ItemNearbyBinBinding) :
        RecyclerView.ViewHolder(binding.root) {
        
        fun bind(bin: NearbyBin) {
            binding.apply {
                tvBinId.text = "Bin ${bin.binId}"
                tvDistance.text = "${bin.distance}m away"
                tvFillLevel.text = "${bin.fillPercentage}% full"
                tvBinType.text = bin.type.capitalize()
                
                // Set status color and text
                val (statusText, statusColor) = when (bin.status) {
                    "full" -> "Full" to R.color.error
                    "needs_collection" -> "Needs Collection" to R.color.warning
                    "empty" -> "Empty" to R.color.success
                    else -> "Normal" to R.color.text_secondary
                }
                
                tvStatus.text = statusText
                tvStatus.setTextColor(ContextCompat.getColor(root.context, statusColor))
                
                // Set fill level progress
                progressFillLevel.progress = bin.fillPercentage
                progressFillLevel.progressTintList = ContextCompat.getColorStateList(
                    root.context,
                    when {
                        bin.fillPercentage >= 80 -> R.color.error
                        bin.fillPercentage >= 60 -> R.color.warning
                        else -> R.color.success
                    }
                )
                
                root.setOnClickListener {
                    onBinClick(bin)
                }
            }
        }
    }
}